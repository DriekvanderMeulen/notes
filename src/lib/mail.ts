import { createTransport } from "nodemailer";
import { env } from "./env";

const transport = createTransport({
  host: env.EMAIL_SERVER_HOST,
  port: Number(env.EMAIL_SERVER_PORT),
  auth: {
    user: env.EMAIL_SERVER_USER,
    pass: env.EMAIL_SERVER_PASSWORD,
  },
});

export async function sendVerificationRequest({
  identifier,
  token,
}: {
  identifier: string;
  token: string;
}) {
  await transport.sendMail({
    to: identifier,
    from: env.EMAIL_FROM,
    subject: "Your login code",
    text: `Your login code is: ${token}`,
    html: `
			<div>
				<p>Your login code is:</p>
				<p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">
					${token}
				</p>
			</div>
		`,
  });
}
