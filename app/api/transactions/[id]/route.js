import { getAll, saveAll } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { handle, unauthorized, fail } from "@/lib/api";

export const PUT = handle(async (req, { params }) => {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const b = await req.json();
  if (!String(b.title || "").trim() || !(+b.amount > 0) || !["income", "expense"].includes(b.type) || !b.date)
    return fail("اطلاعات تراکنش نامعتبر است");
  const list = await getAll(user);
  const i = list.findIndex((t) => String(t.id) === id);
  if (i < 0) return fail("تراکنش پیدا نشد", 404);
  list[i] = {
    id: list[i].id, type: b.type, title: String(b.title).trim().slice(0, 100),
    category: String(b.category || "سایر").slice(0, 40), amount: +b.amount, date: b.date,
    note: String(b.note || "").slice(0, 300),
  };
  await saveAll(user, list);
  return Response.json(list[i]);
});

export const DELETE = handle(async (req, { params }) => {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const list = await getAll(user);
  await saveAll(user, list.filter((t) => String(t.id) !== id));
  return Response.json({ ok: true });
});
