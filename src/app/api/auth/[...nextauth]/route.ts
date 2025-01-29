import NextAuth, { DefaultSession } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { emailLimiter } from "@/lib/ratelimit";
import { generateVerificationToken } from "@/lib/auth";
import { sendVerificationRequest } from "@/lib/mail";
import argon2 from "argon2";

// Extend the DefaultSession interface
declare module "next-auth" {
  interface Session {
    user: {
      id: string; // Add the id property
    } & DefaultSession["user"];
  }
}

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier, token }) {
        // Delete any existing verification tokens for this email
        await prisma.verificationToken.deleteMany({
          where: {
            identifier,
          },
        });

        // Generate a new verification token
        const verificationToken = await generateVerificationToken();
        const hashedToken = await argon2.hash(verificationToken);

        // Store the hashed token in the database
        await prisma.verificationToken.create({
          data: {
            identifier,
            token: hashedToken,
            expires: new Date(Date.now() + 30 * 60 * 1000),
          },
        });

        // Send the new verification email
        await sendVerificationRequest({ identifier, token: verificationToken });
      },
      generateVerificationToken,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Verification Code",
      credentials: {
        email: { label: "Email", type: "email" },
        token: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.token) {
          console.log("Missing credentials");
          return null;
        }

        try {
          const verificationToken = await prisma.verificationToken.findFirst({
            where: {
              identifier: credentials.email,
              expires: {
                gt: new Date(),
              },
            },
          });

          if (!verificationToken) {
            console.log("Invalid or expired token");
            return null;
          }

          // Compare the hashed token with the provided token
          const isValid = await argon2.verify(
            verificationToken.token,
            credentials.token
          );
          if (!isValid) {
            console.log("Invalid token");
            return null;
          }

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });

          if (!user) {
            console.log("User not found");
            return null;
          }

          // Delete the verification token as it's been used
          await prisma.verificationToken.delete({
            where: {
              identifier_token: {
                identifier: credentials.email,
                token: verificationToken.token,
              },
            },
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, email, account }) {
      console.log("SignIn callback:", { user, email, account });

      if (account?.provider === "email" && email?.verificationRequest) {
        try {
          if (!user.email?.endsWith("@driek.dev")) {
            return false;
          }

          const { success, limit, reset } = await emailLimiter.limit(
            user.email
          );
          if (!success) {
            throw new Error(
              `Rate limit exceeded. Try again in ${Math.ceil(
                (reset - Date.now()) / 1000
              )} seconds`
            );
          }
          return true;
        } catch (error) {
          console.error("SignIn error:", error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      console.log("JWT callback:", { token, user });
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("Session callback:", { session, token });
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };
