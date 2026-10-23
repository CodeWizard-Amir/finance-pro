import { getAll, saveAll } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { handle, unauthorized, fail } from "@/lib/api";

export const GET = handle(async () => {
  const user = await getUser();
  if (!user) return unauthorized();
  const list = await getAll(user);
  list.sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  return Response.json(list);
});

export const POST = handle(async (req) => {
  const user = await getUser();
  if (!user) return unauthorized();
  const b = await req.json();
  if (!String(b.title || "").trim() || !(+b.amount > 0) || !["income", "expense"].includes(b.type) || !b.date)
    return fail("اطلاعات تراکنش نامعتبر است");
  const item = {
    id: crypto.randomUUID(), type: b.type, title: String(b.title).trim().slice(0, 100),
    category: String(b.category || "سایر").slice(0, 40), amount: +b.amount, date: b.date,
    note: String(b.note || "").slice(0, 300),
  };
  const list = await getAll(user);
  list.push(item);
  await saveAll(user, list);
  return Response.json(item, { status: 201 });
});
