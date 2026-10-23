import { clearSession } from "@/lib/auth";
import { handle } from "@/lib/api";

export const POST = handle(async () => {
  await clearSession();
  return Response.json({ ok: true });
});
