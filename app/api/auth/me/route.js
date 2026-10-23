import { getUser } from "@/lib/auth";
import { handle, unauthorized } from "@/lib/api";
export const GET = handle(async () => {
  const u = await getUser();
  return u ? Response.json({ username: u }) : unauthorized();
});
