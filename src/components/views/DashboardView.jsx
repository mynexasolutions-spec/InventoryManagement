"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  IndianRupee,
  Percent,
  Wallet,
  Boxes,
  Hammer,
  ScanBarcode,
  ReceiptText,
  PackagePlus,
  Clock,
  CircleDollarSign,
  TrendingUp,
  Sparkles,
  Calendar,
  AlertCircle,
  Activity,
  Layers,
  ChevronRight,
} from "lucide-react";
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, CartesianGrid } from "recharts";
import StatCard from "@/components/StatCard";
import Avatar from "@/components/Avatar";
import ProductPhoto from "@/components/ProductPhoto";
import { SectionCard, EmptyState } from "@/components/ui";
import { useStore } from "@/lib/store";
import { isLow, jobInfo, salesByDay, topProducts, workerTotals, monthOf } from "@/lib/selectors";
import { useCountUp } from "@/lib/useCountUp";
import { formatINR, fmtTime, todayISO } from "@/lib/format";

const fade = (i) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.06 + i * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] },
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function dateLabel(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function HeroTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/20 bg-slate-950/85 px-3.5 py-2.5 text-xs text-white shadow-2xl backdrop-blur-md">
      <div className="text-[11px] font-medium text-white/60">{d.label}</div>
      <div className="mt-0.5 font-mono text-sm font-extrabold text-emerald-300">{formatINR(d.sales)}</div>
    </div>
  );
}

function SegBar({ parts }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-2.5 gap-1 overflow-hidden rounded-full bg-surface-2 p-0.5">
        {parts.map((p, i) => (
          <motion.div
            key={p.label}
            initial={{ width: 0 }}
            animate={{ width: `${(p.value / total) * 100}%` }}
            transition={{ duration: 0.8, delay: 0.4 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full"
            style={{ background: p.color }}
          />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-3.5 gap-y-1">
        {parts.slice(0, 3).map((p) => (
          <span key={p.label} className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const FLOW = [
  {
    id: "products",
    step: "01",
    icon: PackagePlus,
    title: "Add Product",
    text: "Photo, price & GST slab. Barcode & SKU generated automatically.",
    gradient: "from-cyan-500 to-teal-600",
  },
  {
    id: "scan",
    step: "02",
    icon: ScanBarcode,
    title: "Scan Stock",
    text: "Lightning-fast barcode scans to add, count or remove stock with zero typing.",
    gradient: "from-emerald-500 to-teal-700",
  },
  {
    id: "billing",
    step: "03",
    icon: ReceiptText,
    title: "Bill Customer",
    text: "Scan items, calculate CGST/SGST/IGST, and print professional GST tax invoices.",
    gradient: "from-indigo-500 to-blue-600",
  },
  {
    id: "jobwork",
    step: "04",
    icon: Hammer,
    title: "Job Work",
    text: "Track Karigars, issue fabric challans, monitor damages, wages and balances.",
    gradient: "from-amber-500 to-orange-600",
  },
];

const PALETTE = ["#0d9488", "#d97706", "#2563eb", "#7c3aed", "#e11d48", "#059669"];

export default function DashboardView({ onNavigate }) {
  const products = useStore((s) => s.products);
  const workers = useStore((s) => s.workers);
  const jobs = useStore((s) => s.jobs);
  const ledger = useStore((s) => s.ledger);
  const invoices = useStore((s) => s.invoices);
  const stockLog = useStore((s) => s.stockLog);
  const [today] = useState(todayISO);
  const [hello] = useState(greeting);

  const m = useMemo(() => {
    const todayInv = invoices.filter((i) => i.date === today);
    const monthInv = invoices.filter((i) => monthOf(i.date) === monthOf(today));
    const balances = workers
      .map((w, i) => ({
        label: w.name.split(" ")[0],
        value: Math.max(0, workerTotals(ledger, w.id).balance),
        color: PALETTE[i % PALETTE.length],
      }))
      .filter((b) => b.value > 0);
    const byCat = new Map();
    for (const p of products) byCat.set(p.category, (byCat.get(p.category) ?? 0) + p.cost * p.stock);
    const trend = salesByDay(invoices, 14, today);
    const openJobs = jobs.filter((j) => j.status !== "completed");
    const todaySales = todayInv.reduce((s, i) => s + i.total, 0);
    const yesterday = trend[trend.length - 2]?.sales ?? 0;
    return {
      todaySales,
      todayCount: todayInv.length,
      todayTax: todayInv.reduce((s, i) => s + i.totalTax, 0),
      deltaPct: yesterday > 0 ? Math.round(((todaySales - yesterday) / yesterday) * 100) : null,
      monthTax: monthInv.reduce((s, i) => s + i.totalTax, 0),
      monthSales: monthInv.reduce((s, i) => s + i.total, 0),
      monthCount: monthInv.length,
      payable: balances.reduce((s, b) => s + b.value, 0),
      balances,
      stockValue: products.reduce((s, p) => s + p.cost * p.stock, 0),
      stockParts: [...byCat.entries()]
        .map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }))
        .sort((a, b) => b.value - a.value),
      low: products.filter(isLow),
      openJobs,
      overdue: openJobs.filter((j) => jobInfo(j, today).overdue),
      unpaid: invoices.filter((i) => i.status === "unpaid"),
      trend,
      top: topProducts(invoices, 5),
    };
  }, [invoices, jobs, products, workers, ledger, today]);

  const heroNumber = useCountUp(m.todaySales, 1400);
  const maxTop = Math.max(1, ...m.top.map((t) => t.revenue));

  const attention = [
    ...m.overdue.map((j) => {
      const w = workers.find((x) => x.id === j.workerId);
      const p = products.find((x) => x.id === j.productId);
      const info = jobInfo(j, today);
      return {
        key: "j" + j.id,
        tone: "bad",
        tag: "Karigar Overdue",
        icon: Hammer,
        title: `${w?.name ?? "Karigar"} is ${info.lateBy} days late`,
        text: `${info.remaining} pcs of ${p?.name} still pending`,
        action: "Receive",
        go: "jobwork",
      };
    }),
    ...m.low.slice(0, 4).map((p) => ({
      key: "p" + p.id,
      tone: "warn",
      tag: "Low Stock",
      icon: Boxes,
      title: `${p.name} is running low`,
      text: `${p.stock} ${p.unit} remaining (Reorder at ${p.reorder})`,
      action: "Add stock",
      go: "scan",
      photo: p,
    })),
    ...m.unpaid.map((i) => ({
      key: "i" + i.id,
      tone: "warn",
      tag: "Payment Due",
      icon: CircleDollarSign,
      title: `${i.customer.name} payment pending`,
      text: `Invoice #${i.no} · ${formatINR(i.total)} on credit`,
      action: "View",
      go: "billing",
    })),
  ];

  return (
    <div className="flex flex-col gap-8 pb-4">
      {/* ---------- HERO PANEL: EXECUTIVE REAL-TIME COMMAND CENTER ---------- */}
      <motion.div {...fade(0)} className="hero-panel p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="flex flex-col lg:col-span-2">
            <div className="flex flex-col gap-0.5 text-sm font-medium text-white/70 sm:flex-row sm:items-center sm:gap-0">
              <span>{hello}, Nexa Solutions</span>
              <span className="mx-2.5 hidden text-white/25 sm:inline">|</span>
              <span className="text-white/55 sm:text-white/70">{dateLabel(today)}</span>
            </div>

            <div className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-white/55">Today&apos;s revenue</div>
            <div className="mt-1.5 font-display text-[54px] font-black leading-none tracking-tight tabular text-white sm:text-[64px]">
              {formatINR(heroNumber)}
            </div>
            {m.deltaPct !== null ? (
              <div className={`mt-3 text-sm font-semibold ${m.deltaPct >= 0 ? "text-[#8ee6b3]" : "text-[#ffb4ae]"}`}>
                {m.deltaPct >= 0 ? "+" : ""}{m.deltaPct}% compared with yesterday
              </div>
            ) : (
              <div className="mt-3 text-sm text-white/60">Live billing updates</div>
            )}

            <div className="mt-7 grid grid-cols-3 divide-x divide-white/15 border-t border-white/15 pt-5">
              {[
                ["Bills today", "Bills", m.todayCount],
                ["GST today", "GST", formatINR(m.todayTax)],
                ["This month", "Month", formatINR(m.monthSales)],
              ].map(([k, short, v]) => (
                <div key={k} className="min-w-0 px-2.5 first:pl-0 sm:px-4">
                  <div className="whitespace-nowrap text-[11px] font-semibold text-white/55"><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{k}</span></div>
                  <div className="mt-1 whitespace-nowrap font-display text-[15px] font-extrabold tabular sm:text-lg">{v}</div>
                </div>
              ))}
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2.5 pt-7 sm:flex">
              <button onClick={() => onNavigate("billing")} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-3 text-sm font-extrabold text-[#0b3a34] transition-colors hover:bg-white/90 active:scale-[0.98] sm:px-5">
                <ReceiptText size={17} /> New bill
              </button>
              <button onClick={() => onNavigate("scan")} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-white/30 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 active:scale-[0.98] sm:px-5">
                <ScanBarcode size={17} /> Scan stock
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:col-span-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-white">Sales, last 14 days</div>
                <div className="text-xs text-white/55">Today is highlighted</div>
              </div>
              <div className="font-mono text-sm font-bold text-white/80">{formatINR(m.trend.reduce((s, d) => s + d.sales, 0))}</div>
            </div>
            <div className="mt-4 h-60 flex-1 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.trend} margin={{ left: 0, right: 0, top: 8, bottom: 0 }} barCategoryGap="22%">
                  <CartesianGrid horizontal strokeDasharray="2 6" stroke="rgba(255,255,255,0.14)" vertical={false} />
                  <XAxis dataKey="label" interval={1} tick={{ fontSize: 11, fill: "rgba(255,255,255,0.65)" }} axisLine={false} tickLine={false} padding={{ left: 4, right: 4 }} />
                  <Tooltip content={<HeroTip />} cursor={{ fill: "rgba(255,255,255,0.08)" }} />
                  <Bar dataKey="sales" radius={[6, 6, 0, 0]}>
                    {m.trend.map((d, i) => (
                      <Cell key={d.date} fill={i === m.trend.length - 1 ? "#ffffff" : "rgba(255,255,255,0.38)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ---------- DAILY WORKFLOW: 4 INTEGRATED STEPS ---------- */}
      <div>
        <motion.div {...fade(1)} className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-[17px] font-black text-ink tracking-tight flex items-center gap-2">
              <Layers size={18} className="text-accent" />
              <span>How your day works</span>
            </h2>
            <p className="text-xs font-medium text-ink-soft">Complete textile cycle: Products, Barcodes, Invoices and Karigars</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {FLOW.map((f, i) => (
            <motion.button
              key={f.id}
              {...fade(2 + i)}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate(f.id)}
              className="card card-lift group relative flex flex-col justify-between p-5 text-left overflow-hidden border border-line"
            >
              {/* Subtle top indicator */}
              <div className="flex w-full items-center justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} text-white shadow-md shadow-black/10 transition-transform group-hover:scale-105`}
                >
                  <f.icon size={21} strokeWidth={2.2} />
                </div>
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-surface-2 text-ink-faint border border-line">
                  {f.step}
                </span>
              </div>

              <div className="mt-4">
                <div className="font-display text-base font-extrabold text-ink group-hover:text-accent transition-colors flex items-center justify-between">
                  <span>{f.title}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{f.text}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ---------- 4 MAIN KPI CARDS ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={IndianRupee}
          label="Sales this month"
          value={m.monthSales}
          format={formatINR}
          delta={`${m.monthCount} invoices generated`}
          tone="#0d9488"
          index={0}
          spark={m.trend.map((d) => d.sales)}
        />
        <StatCard
          icon={Percent}
          label="GST collected this month"
          value={m.monthTax}
          format={formatINR}
          delta="Ready for GSTR-1"
          tone="#2563eb"
          index={1}
          spark={m.trend.map((d) => d.tax)}
        />
        <StatCard
          icon={Wallet}
          label="Owed to karigars"
          value={m.payable}
          format={formatINR}
          delta={`${m.openJobs.length} active jobs`}
          deltaTone="bad"
          tone="#d97706"
          index={2}
          footer={m.balances.length ? <SegBar parts={m.balances} /> : null}
        />
        <StatCard
          icon={Boxes}
          label="Stock value (cost)"
          value={m.stockValue}
          format={formatINR}
          delta={m.low.length ? `${m.low.length} items low stock` : "Inventory optimal"}
          deltaTone={m.low.length ? "bad" : "good"}
          tone="#059669"
          index={3}
          footer={<SegBar parts={m.stockParts} />}
        />
      </div>

      {/* ---------- ATTENTION & ACTIVITY SECTION ---------- */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Needs attention */}
        <motion.div {...fade(4)} className="xl:col-span-2">
          <SectionCard
            title="Needs your attention"
            subtitle={attention.length ? `${attention.length} pending action items` : "All systems clear"}
            className="h-full"
          >
            {attention.length === 0 ? (
              <EmptyState title="Everything is in order!" text="Stock levels, job work schedules, and customer receivables look great." />
            ) : (
              <div className="flex flex-col gap-2.5">
                {attention.slice(0, 6).map((a) => (
                  <div
                    key={a.key}
                    className="group flex flex-wrap items-center gap-x-3.5 gap-y-3 rounded-2xl border border-line/60 bg-surface-2/60 px-3.5 py-3 transition-all hover:border-line hover:bg-surface hover:shadow-xs sm:flex-nowrap sm:px-4"
                  >
                    {a.photo ? (
                      <ProductPhoto product={a.photo} size={46} rounded="rounded-xl" className="border border-line" />
                    ) : (
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs ${
                          a.tone === "bad" ? "bg-rose-500/10 text-rose-600 border border-rose-500/20" : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        }`}
                      >
                        <a.icon size={20} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 basis-40">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-ink">{a.title}</span>
                        {a.tag && (
                          <span
                            className={`hidden sm:inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                              a.tone === "bad" ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                            }`}
                          >
                            {a.tag}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-ink-soft mt-0.5">{a.text}</div>
                    </div>
                    <button
                      onClick={() => onNavigate(a.go)}
                      className="w-full shrink-0 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-ink-soft transition-all hover:border-accent hover:bg-accent-light hover:text-accent shadow-xs active:scale-95 sm:w-auto"
                    >
                      {a.action}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </motion.div>

        {/* Live stock movement */}
        <motion.div {...fade(5)}>
          <SectionCard
            title="Live Stock Movement"
            subtitle="Updates on scan, billing & job receipt"
            action={
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed
              </span>
            }
            className="h-full"
          >
            <div className="relative flex flex-col gap-3.5">
              <div className="absolute bottom-3 left-[17px] top-3 w-px bg-line" />
              {stockLog.slice(0, 7).map((l) => {
                const p = products.find((x) => x.id === l.productId);
                if (!p) return null;
                const isPositive = l.delta > 0;
                return (
                  <div key={l.id} className="relative flex items-center gap-3">
                    <span
                      className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-surface font-mono text-[11px] font-extrabold shadow-xs ${
                        isPositive
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : l.delta < 0
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                          : "bg-surface-2 text-ink-faint"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {l.delta}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold text-ink">{p.name}</div>
                      <div className="truncate text-[11px] text-ink-faint">
                        {l.reason} • {fmtTime(l.ts)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </motion.div>
      </div>

      {/* ---------- BEST SELLERS & KARIGAR BALANCES ---------- */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Best sellers */}
        <motion.div {...fade(6)}>
          <SectionCard title="Best Sellers" subtitle="Ranked by total revenue" className="h-full">
            <div className="flex flex-col gap-4">
              {m.top.map((t, i) => {
                const p = products.find((x) => x.id === t.productId);
                const rankColors = [
                  "bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-amber-950 shadow-sm border border-amber-300/60 font-black",
                  "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800 shadow-sm border border-slate-300 font-bold",
                  "bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 shadow-sm border border-amber-600 font-bold",
                ];
                return (
                  <div key={t.productId} className="flex items-center gap-3.5 p-2 rounded-xl transition-colors hover:bg-surface-2/70">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-xs ${
                        rankColors[i] || "bg-surface-2 text-ink-faint"
                      }`}
                    >
                      {i + 1}
                    </span>
                    {p && <ProductPhoto product={p} size={44} rounded="rounded-xl" className="border border-line" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-bold text-ink">{t.name}</span>
                        <span className="font-mono text-sm font-black tabular text-ink">{formatINR(t.revenue)}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(t.revenue / maxTop) * 100}%` }}
                          transition={{ duration: 0.9, delay: 0.3 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </motion.div>

        {/* Karigar Balances */}
        <motion.div {...fade(7)}>
          <SectionCard
            title="Karigar Balances"
            subtitle="Outstanding wages & pending settlement"
            action={
              <button
                onClick={() => onNavigate("jobwork")}
                className="rounded-xl bg-accent-light px-3.5 py-1.5 text-xs font-bold text-accent-dark transition-all hover:bg-accent-solid hover:text-white shadow-xs"
              >
                Open Job Work
              </button>
            }
            className="h-full"
          >
            <div className="flex flex-col gap-2.5">
              {workers.map((w) => {
                const t = workerTotals(ledger, w.id);
                const open = jobs.filter((j) => j.workerId === w.id && j.status !== "completed").length;
                return (
                  <div
                    key={w.id}
                    className="flex items-center gap-3 rounded-2xl bg-surface-2/70 border border-line/60 px-3 py-3 transition-colors hover:bg-surface hover:border-line sm:gap-3.5 sm:px-4"
                  >
                    <Avatar name={w.name} tone={w.tone} size={40} radius="rounded-full" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-ink">{w.name}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-ink-faint">
                        <Clock size={11} className="shrink-0 text-accent" />
                        <span className="whitespace-nowrap">{w.specialty}</span>
                        <span>•</span>
                        <span className="whitespace-nowrap font-medium text-ink-soft">
                          {open} active {open === 1 ? "job" : "jobs"}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`shrink-0 whitespace-nowrap font-mono text-base font-extrabold tabular ${
                        t.balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {formatINR(t.balance)}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </motion.div>
      </div>
    </div>
  );
}
