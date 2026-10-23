// پوشش ایمن برای route ها: هر خطا به‌صورت JSON با پیام خوانا برمی‌گردد
export const handle = (fn) => async (req, ctx) => {
  try {
    return await fn(req, ctx);
  } catch (e) {
    console.error(e);
    return Response.json({ error: e?.message || "خطای سرور" }, { status: 500 });
  }
};
export const unauthorized = () => Response.json({ error: "unauthorized" }, { status: 401 });
export const fail = (msg, status = 400) => Response.json({ error: msg }, { status });
