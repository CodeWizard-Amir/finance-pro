import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});
const KEY = "transactions";

export const getAll = async () => (await redis.get(KEY)) || [];
export const saveAll = (list) => redis.set(KEY, list);

// اگر APP_PIN تنظیم شده باشد، بدون رمز درست دسترسی نیست
export const authorized = (req) => {
  const pin = process.env.APP_PIN;
  return !pin || req.headers.get("x-pin") === pin;
};
export const denied = () => Response.json({ error: "unauthorized" }, { status: 401 });