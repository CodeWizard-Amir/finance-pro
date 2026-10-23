import { getRedis } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { handle, unauthorized, fail } from "@/lib/api";

export const GET = handle(async () => {
  const u = await getUser();
  if (!u) return unauthorized();
  return Response.json((await getRedis().get(`settings:${u}`)) || {});
});

export const PUT = handle(async (req) => {
  const u = await getUser();
  if (!u) return unauthorized();
  const { budget } = await req.json();
  if (!(+budget > 0)) return fail("بودجه نامعتبر است");
  const s = { budget: +budget };
  await getRedis().set(`settings:${u}`, s);
  return Response.json(s);
});
