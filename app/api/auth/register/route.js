import { getRedis } from "@/lib/db";
import { hashPassword, setSession, normalizeUser } from "@/lib/auth";
import { handle, fail } from "@/lib/api";
export const POST = handle(async (req) => {
  const { username, password, code } = await req.json();
  const name = normalizeUser(username);
  if (!name) return fail("نام کاربری باید ۳ تا ۲۴ حرف، عدد یا زیرخط باشد");
  if (!password || password.length < 6 || password.length > 100) return fail("رمز عبور حداقل ۶ کاراکتر باشد");
  const need = process.env.SIGNUP_CODE;
  if (need && code !== need) return fail("کد دعوت نادرست است", 403);

  const r = getRedis();
  const max = +(process.env.MAX_USERS || 10);
  if ((await r.scard("users")) >= max) return fail("ظرفیت ثبت‌نام تکمیل شده است", 403);

  const { salt, hash } = hashPassword(password);
  const ok = await r.set(`user:${name}`, { salt, hash, created: Date.now() }, { nx: true });
  if (!ok) return fail("این نام کاربری قبلاً گرفته شده", 409);
  await r.sadd("users", name);
  await setSession(name);
  return Response.json({ username: name });
});
