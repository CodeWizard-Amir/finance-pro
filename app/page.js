"use client";
import { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  FiPlus, FiTrash2, FiEdit2, FiSearch, FiDownload, FiTrendingUp, FiTrendingDown,
  FiPercent, FiX, FiTarget, FiCalendar, FiCoffee, FiHome, FiTruck, FiHeart, FiFilm,
  FiBook, FiShoppingBag, FiBriefcase, FiGift, FiMoreHorizontal, FiActivity, FiAlertTriangle, FiUpload, FiChevronLeft, FiChevronRight,
} from "react-icons/fi";
import { FaWallet } from "react-icons/fa";

/* ───────────── تنظیمات و ثابت‌ها ───────────── */
// ذخیره‌سازی کاملاً محلی: داده‌ها فقط در مرورگر همین دستگاه می‌مانند
const KEY = "fin_tx_v1", BKEY = "fin_budget_v1";
const readTx = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
// نسخه دوم داده‌ها در IndexedDB؛ اگر localStorage پاک شد، از اینجا خودکار برمی‌گردد
const idb = () => new Promise((res, rej) => {
  const r = indexedDB.open("finance-db", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("kv");
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const idbSet = async (k, v) => {
  try {
    const db = await idb();
    await new Promise((res, rej) => {
      const t = db.transaction("kv", "readwrite");
      t.objectStore("kv").put(v, k);
      t.oncomplete = res; t.onerror = () => rej(t.error);
    });
    return true;
  } catch { return false; }
};
const idbGet = async (k) => {
  try {
    const db = await idb();
    return await new Promise((res, rej) => {
      const q = db.transaction("kv").objectStore("kv").get(k);
      q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
    });
  } catch { return undefined; }
};
const TSKEY = "fin_ts_v1";
const readLS = () => {
  try {
    const l = JSON.parse(localStorage.getItem(KEY));
    return { list: Array.isArray(l) ? l : [], ts: +localStorage.getItem(TSKEY) || 0 };
  } catch { return { list: [], ts: 0 }; }
};
// در هر دو جا می‌نویسد؛ اگر یکی از آن‌ها شکست خورد، دیگری کافی است
const writeTx = async (list) => {
  const ts = Date.now();
  let ls = false;
  try { localStorage.setItem(KEY, JSON.stringify(list)); localStorage.setItem(TSKEY, String(ts)); ls = true; } catch {}
  const db = await idbSet("tx", { ts, list });
  return ls || db;
};
const saveBudget = (v) => { try { localStorage.setItem(BKEY, v); } catch {} idbSet("budget", v); };
const sortTx = (l) => [...l].sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

const CATS = {
  expense: {
    "خوراک": [FiCoffee, "#fbbf24"], "مسکن": [FiHome, "#818cf8"], "حمل‌ونقل": [FiTruck, "#38bdf8"],
    "سلامت": [FiHeart, "#fb7185"], "سرگرمی": [FiFilm, "#c084fc"], "آموزش": [FiBook, "#2dd4bf"],
    "خرید": [FiShoppingBag, "#f472b6"], "سایر": [FiMoreHorizontal, "#94a3b8"],
  },
  income: {
    "حقوق": [FiBriefcase, "#2dd4bf"], "پروژه": [FiActivity, "#38bdf8"],
    "سرمایه‌گذاری": [FiTrendingUp, "#a3e635"], "هدیه": [FiGift, "#f472b6"], "سایر": [FiMoreHorizontal, "#94a3b8"],
  },
};
const catMeta = (type, name) => CATS[type]?.[name] || [FiMoreHorizontal, "#94a3b8"];

const PERIODS = [
  { k: "today", l: "امروز", d: 1 }, { k: "week", l: "۷ روز", d: 7 }, { k: "month", l: "۳۰ روز", d: 30 },
  { k: "year", l: "سال", d: 365 }, { k: "all", l: "همه", d: 0 },
];
const WEEK = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const INCOME = "#2dd4bf", EXPENSE = "#fb7185", ACCENT = "#818cf8";

/* ───────────── توابع کمکی ───────────── */
const fa = new Intl.NumberFormat("fa-IR");
const money = (n) => fa.format(Math.round(n || 0));
const compact = (n) => new Intl.NumberFormat("fa-IR", { notation: "compact", maximumFractionDigits: 1 }).format(n || 0);
const iso = (d) => d.toLocaleDateString("en-CA");
const at = (s) => new Date(s + "T12:00:00");
const pDate = (s, o = { day: "numeric", month: "long", year: "numeric" }) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", o).format(at(s));
const weekdayIdx = (s) => (at(s).getDay() + 1) % 7; // شنبه = ۰

/* تقویم شمسی: ذخیره‌سازی میلادی (ISO) می‌ماند و فقط نمایش/انتخاب شمسی است */
const PMONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const toLatin = (s) => String(s)
  .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
  .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
const faNum = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const PM = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", { year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC" });
const utcIso = (ms) => new Date(ms).toISOString().slice(0, 10);
const toJ = (s) => {
  const [Y, M, D] = s.split("-").map(Number);
  const o = {};
  PM.formatToParts(new Date(Date.UTC(Y, M - 1, D, 12))).forEach((p) => { if (["year", "month", "day"].includes(p.type)) o[p.type] = +p.value; });
  return { y: o.year, m: o.month, d: o.day };
};
const nowruz = (y) => {
  let t = Date.UTC(y + 621, 2, 17, 12);
  for (let i = 0; i < 8; i++, t += 864e5) { const j = toJ(utcIso(t)); if (j.y === y && j.m === 1 && j.d === 1) return t; }
  return Date.UTC(y + 621, 2, 21, 12);
};
const monthLen = (y, m) => (m <= 6 ? 31 : m <= 11 ? 30 : Math.round((nowruz(y + 1) - nowruz(y)) / 864e5) - 336);
const toG = (y, m, d) => {
  let off = d - 1;
  for (let i = 1; i < m; i++) off += i <= 6 ? 31 : 30;
  return utcIso(nowruz(y) + off * 864e5);
};

const tip = {
  contentStyle: { background: "#151c33", border: "1px solid #2a3350", borderRadius: 14, color: "#e6e9f5", fontFamily: "inherit" },
  formatter: (v) => money(v) + " تومان",
  cursor: { fill: "rgba(255,255,255,0.04)" },
};

/* ───────────── صفحه اصلی ───────────── */
// فقط سمت کلاینت رندر می‌شود، پس new Date() و localStorage هنگام build مشکل نمی‌سازند
export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <Dashboard /> : <div className="grid min-h-screen place-items-center text-slate-500">در حال بارگذاری…</div>;
}

function Dashboard() {
  const [tx, setTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("month");
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState("all");
  const [modal, setModal] = useState(null); // null | {} | تراکنش برای ویرایش
  const [budget, setBudget] = useState(30000000);
  const [installEvt, setInstallEvt] = useState(null);
  const [toast, setToast] = useState("");
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 3000); };
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setInstallEvt(e); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  useEffect(() => {
    (async () => {
      const ls = readLS();
      const m = await idbGet("tx");
      const mi = Array.isArray(m) ? { list: m, ts: 0 } : m && Array.isArray(m.list) ? m : null;
      let list = ls.list;
      // نسخه جدیدتر برنده است؛ و اگر یکی خالی بود از دیگری بازیابی می‌شود
      if (mi && (mi.ts > ls.ts || (!ls.list.length && mi.list.length))) list = mi.list;
      let b = null;
      try { b = localStorage.getItem(BKEY); } catch {}
      if (!b) {
        const mb = await idbGet("budget");
        if (mb > 0) { b = mb; try { localStorage.setItem(BKEY, mb); } catch {} }
      }
      setTx(sortTx(list));
      if (b > 0) setBudget(+b);
      setLoading(false);
      if (list.length) writeTx(list); // هر دو نسخه را هم‌گام کن
      try { navigator.storage?.persist?.(); } catch {} // جلوگیری از پاک‌شدن خودکار داده توسط مرورگر
    })();
  }, []);
  const commit = (list) => {
    setTx(sortTx(list)); // بلافاصله نمایش بده، بعد ذخیره کن
    writeTx(list).then((ok) => { if (!ok) alert("ذخیره‌سازی مرورگر پاسخ نداد! از بخش «پشتیبان‌گیری» یک نسخه بگیرید."); });
  };

  const range = useMemo(() => {
    const p = PERIODS.find((x) => x.k === period);
    const end = new Date();
    const start = new Date();
    if (p.d) start.setDate(end.getDate() - p.d + 1);
    else {
      const min = tx.length ? tx.reduce((a, t) => (t.date < a ? t.date : a), tx[0].date) : iso(end);
      start.setTime(at(min).getTime());
      const max = tx.reduce((a, t) => (t.date > a ? t.date : a), iso(end));
      end.setTime(at(max).getTime()); // تراکنش با تاریخ آینده هم دیده شود
    }
    const n = Math.max(1, Math.round((at(iso(end)) - at(iso(start))) / 864e5) + 1);
    return { from: iso(start), to: iso(end), n };
  }, [period, tx]);

  const inRange = useMemo(() => tx.filter((t) => t.date >= range.from && t.date <= range.to), [tx, range]);

  /* آمار کلی */
  const s = useMemo(() => {
    const inc = inRange.filter((t) => t.type === "income");
    const exp = inRange.filter((t) => t.type === "expense");
    const income = inc.reduce((a, t) => a + t.amount, 0);
    const expense = exp.reduce((a, t) => a + t.amount, 0);
    const biggest = exp.reduce((m, t) => (!m || t.amount > m.amount ? t : m), null);
    return {
      income, expense, balance: income - expense,
      rate: income ? ((income - expense) / income) * 100 : 0,
      avgDayExp: expense / range.n, avgDayInc: income / range.n,
      avgTxExp: exp.length ? expense / exp.length : 0, count: inRange.length, biggest,
    };
  }, [inRange, range]);

  /* نمودار روند (روزانه یا ماهانه) */
  const series = useMemo(() => {
    if (range.n <= 31) {
      const arr = [];
      for (let i = 0; i < range.n; i++) {
        const d = at(range.from); d.setDate(d.getDate() + i);
        const k = iso(d);
        arr.push({ k, name: pDate(k, { day: "numeric", month: "short" }), income: 0, expense: 0 });
      }
      const idx = Object.fromEntries(arr.map((a, i) => [a.k, i]));
      inRange.forEach((t) => { const a = arr[idx[t.date]]; if (a) a[t.type] += t.amount; });
      return arr;
    }
    const m = new Map();
    [...inRange].sort((a, b) => a.date.localeCompare(b.date)).forEach((t) => {
      const name = pDate(t.date, { month: "short", year: "2-digit" });
      if (!m.has(name)) m.set(name, { name, income: 0, expense: 0 });
      m.get(name)[t.type] += t.amount;
    });
    return [...m.values()];
  }, [inRange, range]);

  const catData = useMemo(() => {
    const m = {};
    inRange.filter((t) => t.type === "expense").forEach((t) => (m[t.category] = (m[t.category] || 0) + t.amount));
    return Object.entries(m).map(([name, value]) => ({ name, value, color: catMeta("expense", name)[1] })).sort((a, b) => b.value - a.value);
  }, [inRange]);

  const weekData = useMemo(() => {
    const arr = WEEK.map((name) => ({ name, income: 0, expense: 0 }));
    inRange.forEach((t) => (arr[weekdayIdx(t.date)][t.type] += t.amount));
    return arr;
  }, [inRange]);

  const topDay = useMemo(() => weekData.reduce((m, d) => (d.expense > m.expense ? d : m), weekData[0]), [weekData]);

  /* بودجه ۳۰ روز اخیر */
  const spent30 = useMemo(() => {
    const f = new Date(); f.setDate(f.getDate() - 29);
    return tx.filter((t) => t.type === "expense" && t.date >= iso(f)).reduce((a, t) => a + t.amount, 0);
  }, [tx]);
  const bPct = Math.min(100, (spent30 / budget) * 100);

  /* لیست */
  const list = useMemo(() => inRange.filter((t) =>
    (typeF === "all" || t.type === typeF) &&
    (!q || (t.title + t.category + (t.note || "")).includes(q))
  ), [inRange, q, typeF]);

  /* عملیات */
  const save = (data) => {
    const item = { id: data.id || uid(), type: data.type, title: data.title, category: data.category, amount: +data.amount, date: data.date, note: data.note || "" };
    commit(data.id ? tx.map((t) => (t.id === data.id ? item : t)) : [...tx, item]);
    setModal(null);
    if (period !== "all" && (item.date > range.to || item.date < range.from)) {
      setPeriod("all");
      flash("ذخیره شد؛ بازه روی «همه» رفت تا این تراکنش دیده شود");
    } else flash("ذخیره شد ✓");
  };
  const remove = (id) => {
    if (!confirm("این تراکنش حذف شود؟")) return;
    commit(tx.filter((t) => t.id !== id));
  };
  const backup = () => {
    const blob = new Blob([JSON.stringify({ app: "finance", version: 1, budget, transactions: tx }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `finance-backup-${iso(new Date())}.json`;
    a.click();
  };
  const restore = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);
        const list = (Array.isArray(d) ? d : d.transactions || [])
          .filter((t) => t && t.date && +t.amount > 0 && ["income", "expense"].includes(t.type))
          .map((t) => ({ ...t, id: t.id || uid(), amount: +t.amount }));
        if (!confirm(`${fa.format(list.length)} تراکنش بازیابی شود؟ داده‌های فعلی جایگزین می‌شوند.`)) return;
        commit(list);
        if (d.budget > 0) { setBudget(+d.budget); saveBudget(+d.budget); }
      } catch { alert("فایل پشتیبان معتبر نیست."); }
    };
    rd.readAsText(file);
  };
  const editBudget = () => {
    const v = +toLatin(prompt("بودجه ماهانه (تومان):", budget) || "").replace(/[,٬،\s]/g, "");
    if (v > 0) { setBudget(v); saveBudget(v); }
  };
  const exportCsv = () => {
    const rows = [["تاریخ", "نوع", "عنوان", "دسته", "مبلغ", "یادداشت"],
      ...list.map((t) => [pDate(t.date, { year: "numeric", month: "2-digit", day: "2-digit" }), t.type === "income" ? "درآمد" : "هزینه", t.title, t.category, t.amount, t.note || ""])];
    const blob = new Blob(["\uFEFF" + rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "transactions.csv"; a.click();
  };

  const todayLabel = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
      {/* هدر */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-teal-300 text-slate-900 shadow-lg shadow-indigo-500/20">
            <FaWallet size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">مدیریت مالی من</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-400"><FiCalendar /> {todayLabel}</p>
            <p className="mt-1 flex flex-wrap items-center gap-4 text-sm text-slate-400">
              <button onClick={backup} className="flex items-center gap-1 text-indigo-300 hover:underline"><FiDownload /> پشتیبان‌گیری</button>
              <label className="flex cursor-pointer items-center gap-1 text-indigo-300 hover:underline">
                <FiUpload /> بازیابی
                <input type="file" accept="application/json,.json" onChange={restore} className="hidden" />
              </label>
              {installEvt && (
                <button onClick={async () => { installEvt.prompt(); await installEvt.userChoice; setInstallEvt(null); }}
                  className="flex items-center gap-1 text-indigo-300 hover:underline"><FiDownload /> نصب اپ</button>
              )}
            </p>
          </div>
        </div>
        <button onClick={() => setModal({})} className="flex items-center gap-2 rounded-2xl bg-indigo-400 px-5 py-3 font-bold text-slate-900 shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300">
          <FiPlus size={20} /> تراکنش جدید
        </button>
      </header>


      {/* فیلتر بازه */}
      <div className="mt-6 inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
        {PERIODS.map((p) => (
          <button key={p.k} onClick={() => setPeriod(p.k)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${period === p.k ? "bg-indigo-400 text-slate-900" : "text-slate-300 hover:bg-white/5"}`}>
            {p.l}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">از {pDate(range.from)} تا {pDate(range.to)} ({fa.format(range.n)} روز)</p>

      {/* کارت‌های خلاصه */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<FaWallet />} label="موجودی بازه" value={s.balance} color={s.balance >= 0 ? INCOME : EXPENSE} sub={`${fa.format(s.count)} تراکنش`} big />
        <Stat icon={<FiTrendingUp />} label="کل درآمد" value={s.income} color={INCOME} sub={`میانگین روزانه ${compact(s.avgDayInc)}`} />
        <Stat icon={<FiTrendingDown />} label="کل هزینه" value={s.expense} color={EXPENSE} sub={`میانگین روزانه ${compact(s.avgDayExp)}`} />
        <Stat icon={<FiPercent />} label="نرخ پس‌انداز" raw={`${fa.format(Math.round(s.rate))}٪`} color={ACCENT} sub={`میانگین هر هزینه ${compact(s.avgTxExp)}`} />
      </section>

      {/* روند + بودجه */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="روند درآمد و هزینه" className="lg:col-span-2">
          <div dir="ltr" className="h-72">
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  {[["gi", INCOME], ["ge", EXPENSE]].map(([id, c]) => (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c} stopOpacity={0.45} /><stop offset="100%" stopColor={c} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={compact} width={48} />
                <Tooltip {...tip} />
                <Area type="monotone" dataKey="income" name="درآمد" stroke={INCOME} strokeWidth={2.5} fill="url(#gi)" />
                <Area type="monotone" dataKey="expense" name="هزینه" stroke={EXPENSE} strokeWidth={2.5} fill="url(#ge)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="بودجه ماهانه" action={<button onClick={editBudget} className="text-xs text-indigo-300 hover:underline">ویرایش</button>}>
          <div className="flex items-center gap-3">
            <FiTarget size={22} className="text-indigo-300" />
            <div className="text-3xl font-extrabold">{fa.format(Math.round(bPct))}٪</div>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-all" style={{ width: `${bPct}%`, background: bPct > 90 ? EXPENSE : bPct > 70 ? "#fbbf24" : INCOME }} />
          </div>
          <p className="mt-3 text-sm text-slate-400">خرج ۳۰ روز اخیر: <b className="text-slate-200">{money(spent30)}</b></p>
          <p className="text-sm text-slate-400">سقف بودجه: <b className="text-slate-200">{money(budget)}</b></p>
          <p className="mt-2 text-sm" style={{ color: spent30 > budget ? EXPENSE : INCOME }}>
            {spent30 > budget ? `${money(spent30 - budget)} تومان از بودجه بیشتر خرج کرده‌اید` : `${money(budget - spent30)} تومان تا سقف بودجه مانده`}
          </p>
        </Card>
      </section>

      {/* دسته‌ها + روز هفته + بینش‌ها */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="هزینه به تفکیک دسته">
          {catData.length ? (
            <>
              <div dir="ltr" className="h-48">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={catData} dataKey="value" innerRadius={48} outerRadius={78} paddingAngle={3} stroke="none">
                      {catData.map((c) => <Cell key={c.name} fill={c.color} />)}
                    </Pie>
                    <Tooltip {...tip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1.5 text-sm">
                {catData.slice(0, 5).map((c) => (
                  <li key={c.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.name}</span>
                    <span className="text-slate-400">{fa.format(Math.round((c.value / s.expense) * 100))}٪</span>
                  </li>
                ))}
              </ul>
            </>
          ) : <Empty />}
        </Card>

        <Card title="مقایسه روزهای هفته">
          <div dir="ltr" className="h-64">
            <ResponsiveContainer>
              <BarChart data={weekData} margin={{ left: 0, right: 4 }}>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={compact} width={44} />
                <Tooltip {...tip} />
                <Bar dataKey="income" name="درآمد" fill={INCOME} radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="هزینه" fill={EXPENSE} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="نکته‌های این بازه">
          <ul className="space-y-3 text-sm leading-7 text-slate-300">
            <Insight>پرخرج‌ترین روز هفته: <b>{topDay.expense ? topDay.name : "—"}</b></Insight>
            <Insight>بیشترین هزینه در دسته: <b>{catData[0]?.name || "—"}</b></Insight>
            <Insight>بزرگ‌ترین هزینه: <b>{s.biggest ? `${s.biggest.title} (${money(s.biggest.amount)})` : "—"}</b></Insight>
            <Insight>میانگین هزینه روزانه: <b>{money(s.avgDayExp)}</b> تومان</Insight>
            <Insight>
              {s.rate >= 20 ? "نرخ پس‌انداز عالی است 👌" : s.rate >= 0 ? "کمی بیشتر پس‌انداز کنید تا به ۲۰٪ برسید." : "هزینه‌ها از درآمد بیشتر شده‌اند."}
            </Insight>
          </ul>
        </Card>
      </section>

      {/* جدول تراکنش‌ها */}
      <Card title="تراکنش‌ها" className="mt-4" action={
        <button onClick={exportCsv} className="flex items-center gap-1 text-xs text-indigo-300 hover:underline"><FiDownload /> خروجی CSV</button>
      }>
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-52 flex-1">
            <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در عنوان و دسته…"
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-10 pl-3 outline-none focus:border-indigo-400" />
          </div>
          <div className="flex rounded-xl border border-white/10 bg-white/5 p-1 text-sm">
            {[["all", "همه"], ["income", "درآمد"], ["expense", "هزینه"]].map(([k, l]) => (
              <button key={k} onClick={() => setTypeF(k)} className={`rounded-lg px-4 py-1.5 ${typeF === k ? "bg-white/15 font-bold" : "text-slate-400"}`}>{l}</button>
            ))}
          </div>
        </div>

        {loading ? <p className="py-10 text-center text-slate-500">در حال بارگذاری…</p> : list.length === 0 ? <Empty /> : (
          <ul className="divide-y divide-white/5">
            {list.map((t) => {
              const [Icon, color] = catMeta(t.type, t.category);
              return (
                <li key={t.id} className="group flex items-center gap-4 py-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: color + "22", color }}><Icon size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.category} • {WEEK[weekdayIdx(t.date)]} {pDate(t.date, { day: "numeric", month: "long" })}</p>
                  </div>
                  <b className="whitespace-nowrap" style={{ color: t.type === "income" ? INCOME : EXPENSE }}>
                    {t.type === "income" ? "+" : "−"}{money(t.amount)}
                  </b>
                  <div className="flex gap-1 opacity-60 transition group-hover:opacity-100">
                    <button aria-label="ویرایش" onClick={() => setModal(t)} className="rounded-lg p-2 hover:bg-white/10"><FiEdit2 /></button>
                    <button aria-label="حذف" onClick={() => remove(t.id)} className="rounded-lg p-2 text-rose-300 hover:bg-rose-400/10"><FiTrash2 /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <footer className="mt-10 pb-6 text-center text-sm text-slate-500">
        {" "} امیرسجاد نوری {" "} - 
        <a href="https://nouriverse.vercel.app" target="_blank" rel="noopener noreferrer" dir="ltr" className="transition hover:text-indigo-300">
          nouriverse.vercel.app
        </a>
      </footer>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-2xl bg-teal-300 px-5 py-3 text-sm font-bold text-slate-900 shadow-xl">
          {toast}
        </div>
      )}

      {modal && <TxModal item={modal} onClose={() => setModal(null)} onSave={save} />}
    </main>
  );
}

/* ───────────── کامپوننت‌ها ───────────── */
function Card({ title, action, className = "", children }) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold">{title}</h2>{action}
      </div>
      {children}
    </div>
  );
}
function Stat({ icon, label, value, raw, color, sub, big }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full blur-2xl" style={{ background: color + "33" }} />
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span style={{ color }}>{icon}</span>{label}
      </div>
      <p className={`mt-3 font-extrabold ${big ? "text-3xl" : "text-2xl"}`} style={{ color: big ? color : undefined }}>
        {raw ?? money(value)} {raw ? "" : <small className="text-xs font-normal text-slate-500">تومان</small>}
      </p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}
const Insight = ({ children }) => <li className="rounded-xl bg-white/5 px-3 py-2">{children}</li>;
const Empty = () => <p className="py-10 text-center text-sm text-slate-500">برای این بازه داده‌ای نیست. یک تراکنش اضافه کنید.</p>;

function TxModal({ item, onClose, onSave }) {
  const [f, setF] = useState({
    type: "expense", title: "", amount: "", category: "خوراک", date: iso(new Date()), note: "", ...item,
  });
  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setErr(""); };
  const cats = Object.keys(CATS[f.type]);
  const [err, setErr] = useState("");
  const submit = () => {
    if (!f.title.trim()) return setErr("عنوان را وارد کنید.");
    if (!(+f.amount > 0)) return setErr("مبلغ را وارد کنید (بزرگ‌تر از صفر).");
    onSave({ ...f, amount: +f.amount, title: f.title.trim() });
  };
  const input = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-indigo-400";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-white/10 bg-[#121933] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-extrabold">{f.id ? "ویرایش تراکنش" : "تراکنش جدید"}</h3>
          <button onClick={onClose} aria-label="بستن" className="rounded-lg p-2 hover:bg-white/10"><FiX /></button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-1">
          {[["expense", "هزینه", EXPENSE], ["income", "درآمد", INCOME]].map(([k, l, c]) => (
            <button key={k} onClick={() => setF((p) => ({ ...p, type: k, category: Object.keys(CATS[k])[0] }))}
              className="rounded-xl py-2 font-bold transition" style={f.type === k ? { background: c, color: "#0b1020" } : { color: "#94a3b8" }}>{l}</button>
          ))}
        </div>

        <div className="space-y-3">
          <input className={input} placeholder="عنوان (مثلاً ناهار)" value={f.title} onChange={(e) => set("title", e.target.value)} />
          <input className={input} dir="ltr" inputMode="numeric" placeholder="مبلغ (تومان)" value={f.amount}
            onChange={(e) => set("amount", toLatin(e.target.value).replace(/\D/g, ""))} />
          {+f.amount > 0 && <p className="-mt-1 text-xs text-slate-400">{money(f.amount)} تومان</p>}
          <div className="grid gap-3">
            <select className={input} value={f.category} onChange={(e) => set("category", e.target.value)}>
              {cats.map((c) => <option key={c} className="bg-slate-900">{c}</option>)}
            </select>
            <DatePicker value={f.date} onChange={(v) => set("date", v)} />
          </div>
          <textarea rows={2} className={input} placeholder="یادداشت (اختیاری)" value={f.note} onChange={(e) => set("note", e.target.value)} />
        </div>

        {err && <p className="mt-4 rounded-xl bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{err}</p>}
        <button onClick={submit}
          className="mt-4 w-full rounded-2xl bg-indigo-400 py-3 font-extrabold text-slate-900 transition hover:bg-indigo-300">
          {f.id ? "ذخیره تغییرات" : "افزودن"}
        </button>
      </div>
    </div>
  );
}

function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const sel = toJ(value);
  const today = iso(new Date());
  const tj = toJ(today);
  const [view, setView] = useState({ y: sel.y, m: sel.m });

  const toggle = () => { if (!open) setView({ y: sel.y, m: sel.m }); setOpen(!open); };
  const go = (dm) => setView(({ y, m }) => {
    let nm = m + dm, ny = y;
    if (nm > 12) { nm = 1; ny++; }
    if (nm < 1) { nm = 12; ny--; }
    return { y: ny, m: nm };
  });
  const pick = (d) => { onChange(toG(view.y, view.m, d)); setOpen(false); };

  const lead = (new Date(toG(view.y, view.m, 1) + "T12:00:00Z").getUTCDay() + 1) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: monthLen(view.y, view.m) }, (_, i) => i + 1)];
  const y0 = Math.min(view.y, tj.y - 15), y1 = Math.max(view.y, tj.y + 5);
  const years = Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i);
  const sm = "rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm outline-none focus:border-indigo-400";

  return (
    <div>
      <button type="button" onClick={toggle}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-right outline-none focus:border-indigo-400">
        <span>{WEEK[weekdayIdx(value)]} {pDate(value)}</span>
        <FiCalendar className="text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10 bg-black/40" onClick={() => setOpen(false)} />
          <div className="fixed left-1/2 top-1/2 z-20 w-[92vw] max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-[#171f3d] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button type="button" aria-label="ماه قبل" onClick={() => go(-1)} className="rounded-lg p-2 hover:bg-white/10"><FiChevronRight /></button>
              <div className="flex gap-2">
                <select className={sm} value={view.m} onChange={(e) => setView({ ...view, m: +e.target.value })}>
                  {PMONTHS.map((n, i) => <option key={n} value={i + 1} className="bg-slate-900">{n}</option>)}
                </select>
                <select className={sm} value={view.y} onChange={(e) => setView({ ...view, y: +e.target.value })}>
                  {years.map((y) => <option key={y} value={y} className="bg-slate-900">{faNum(y)}</option>)}
                </select>
              </div>
              <button type="button" aria-label="ماه بعد" onClick={() => go(1)} className="rounded-lg p-2 hover:bg-white/10"><FiChevronLeft /></button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
              {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((w) => <span key={w} className="py-1">{w}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (!d) return <span key={i} />;
                const isSel = view.y === sel.y && view.m === sel.m && d === sel.d;
                const isToday = view.y === tj.y && view.m === tj.m && d === tj.d;
                const friday = (lead + d - 1) % 7 === 6;
                return (
                  <button key={i} type="button" onClick={() => pick(d)}
                    className={`aspect-square rounded-xl text-sm transition ${isSel ? "bg-indigo-400 font-bold text-slate-900" : "hover:bg-white/10"} ${!isSel && isToday ? "ring-1 ring-teal-300" : ""} ${!isSel && friday ? "text-rose-300" : ""}`}>
                    {faNum(d)}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex justify-between text-sm">
              <button type="button" onClick={() => { onChange(today); setOpen(false); }} className="text-indigo-300 hover:underline">امروز</button>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:underline">بستن</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}