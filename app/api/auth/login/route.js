import { getRedis } from "@/lib/db";
import { checkPassword, setSession, normalizeUser } from "@/lib/auth";
import { handle, fail } from "@/lib/api";

export const POST = handle(async (req) => {
  const { username, password } = await req.json();
  const name = normalizeUser(username);
  if (!name || !password) return fail("نام کاربری یا رمز اشتباه است", 401);

  const r = getRedis();
  const rk = `rl:${name}`; // محدودیت تلاش: ۱۰ بار در ۱۰ دقیقه
  const n = await r.incr(rk);
  if (n === 1) await r.expire(rk, 600);
  if (n > 10) return fail("تلاش بیش از حد. ۱۰ دقیقه بعد دوباره امتحان کنید", 429);

  const u = await r.get(`user:${name}`);
  if (!u || !checkPassword(String(password), u.salt, u.hash)) return fail("نام کاربری یا رمز اشتباه است", 401);
  await r.del(rk);
  await setSession(name);
  return Response.json({ username: name });
});
