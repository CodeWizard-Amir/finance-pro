import crypto from "crypto";
import { cookies } from "next/headers";

const DAYS = 30;
const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("متغیر AUTH_SECRET تنظیم نشده است (حداقل ۱۶ کاراکتر)");
  return s;
};
const hmac = (body) => crypto.createHmac("sha256", secret()).update(body).digest("base64url");

export const normalizeUser = (u) => {
  const n = String(u || "").trim().toLowerCase();
  return /^[\p{L}\p{N}_]{3,24}$/u.test(n) ? n : null;
};

export const hashPassword = (pw, salt = crypto.randomBytes(16).toString("hex")) => ({
  salt,
  hash: crypto.scryptSync(pw, salt, 64).toString("hex"),
});
export const checkPassword = (pw, salt, hash) => {
  const a = Buffer.from(crypto.scryptSync(pw, salt, 64).toString("hex"));
  const b = Buffer.from(String(hash));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const sign = (payload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(body)}`;
};
const verify = (token) => {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const good = hmac(body);
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
};

export async function getUser() {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;
  return verify(token)?.u || null;
}
export async function setSession(username) {
  (await cookies()).set("session", sign({ u: username, exp: Date.now() + DAYS * 864e5 }), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: DAYS * 86400,
  });
}
export async function clearSession() {
  (await cookies()).set("session", "", { path: "/", maxAge: 0 });
}
