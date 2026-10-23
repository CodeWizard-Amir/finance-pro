import { Redis } from "@upstash/redis";

// نام متغیرها بسته به روش ساخت دیتابیس فرق می‌کند (مثلاً KV_… یا STORAGE_… از Vercel)؛
// پس هر نامی که به این الگوها ختم شود پذیرفته می‌شود.
const find = (re) => {
  const k = Object.keys(process.env).find((n) => re.test(n) && process.env[n]);
  return k ? process.env[k].trim() : "";
};

let redis;
export const getRedis = () => {
  if (redis) return redis;
  const url = find(/(UPSTASH_REDIS_REST_URL|REST_API_URL|REDIS_REST_URL)$/);
  const token = find(/(UPSTASH_REDIS_REST_TOKEN|REST_API_TOKEN|REDIS_REST_TOKEN)$/);
  if (!url || !token) {
    const seen = Object.keys(process.env).filter((n) => /REDIS|KV_|UPSTASH|STORAGE/i.test(n));
    throw new Error(
      "اطلاعات Redis پیدا نشد. متغیرهای موجود با این نام‌ها: " + (seen.join(", ") || "هیچ‌کدام")
    );
  }
  redis = new Redis({ url, token });
  return redis;
};

export const getAll = async (user) => (await getRedis().get(`tx:${user}`)) || [];
export const saveAll = (user, list) => getRedis().set(`tx:${user}`, list);