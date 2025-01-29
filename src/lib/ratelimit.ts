import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const emailLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "24 h"), // 20 attempts per 24 hours
  analytics: true,
});
