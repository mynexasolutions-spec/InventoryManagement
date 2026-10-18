"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Percent, TrendingUp, Boxes, Hammer, Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import ProductPhoto from "@/components/ProductPhoto";
import { Btn, SectionCard, EmptyState } from "@/components/ui";
import { useStore } from "@/lib/store";
import { isLow, monthOf, salesByDay, topProducts, workerTotals } from "@/lib/selectors";
import { downloadCSV } from "@/lib/csv";
import { formatINR, formatINR2, fmtDate, fmtTime, todayISO } from "@/lib/format";
import { stateName } from "@/lib/gst";

const TABS = [
  { id: "gst", label: "GST", icon: Percent },
  { id: "sales", label: "Sales", icon: TrendingUp },
  { id: "stock", label: "Stock", icon: Boxes },
  { id: "jobwork", label: "Job-work", short: "Jobs", icon: Hammer },
];
const COLORS = ["#0E6E66", "#C97E2E", "#3568B0", "#8A4FB0", "#B33A3A", "#2F7A4F"];
const TYPE_META = {
  opening: ["Opening", "neutral"], sale: ["Sale", "info"], "stock-in": ["Stock in", "good"], "stock-out": ["Stock out", "bad"],
  "job-out": ["To karigar", "warn"], "job-in": ["From karigar", "good"], damage: ["Damage", "bad"], audit: ["Audit", "accent"], adjust: ["Adjust", "neutral"],
};

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs">
      {label && <div className="font-semibold text-ink">{label}</div>}
      <div className="font-mono text-ink-soft">{payload[0].name !== "sales" && payload[0].name ? payload[0].name + ": " : ""}{formatINR(payload[0].value)}</div>
    </div>
  );
}

const th = "pb-2 font-medium";
const money = (n) => formatINR2(n);

export default function ReportsView() {
  const products = useStore((s) => s.products);
  const workers = useStore((s) => s.workers);
  const jobs = useStore((s) => s.jobs);
  const ledger = useStore((s) => s.ledger);
  const invoices = useStore((s) => s.invoices);
  const stockLog = useStore((s) => s.stockLog);
  const business = useStore((s) => s.business);
  const [today] = useState(todayISO);
  const [tab, setTab] = useState("gst");
  const [month, setMonth] = useState(monthOf(today));

  const months = useMemo(() => [...new Set([monthOf(today), ...invoices.map((i) => monthOf(i.date))])].sort().reverse(), [invoices, today]);
  const monthInv = useMemo(() => invoices.filter((i) => monthOf(i.date) === month), [invoices, month]);

  const gst = useMemo(() => {
    const sum = (k) => monthInv.reduce((s, i) => s + i[k], 0);
    const rate = new Map();
    const hsn = new Map();
    for (const inv of monthInv) {
      for (const it of inv.items) {
        const r = rate.get(it.gst) ?? { gst: it.gst, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        r.taxable += it.taxable; r.cgst += it.cgst; r.sgst += it.sgst; r.igst += it.igst;
        rate.set(it.gst, r);
        const hk = it.hsn + "|" + it.gst;
        const h = hsn.get(hk) ?? { hsn: it.hsn, gst: it.gst, qty: 0, taxable: 0, tax: 0 };
        h.qty += it.qty; h.taxable += it.taxable; h.tax += it.tax;
        hsn.set(hk, h);
      }
    }
    return {
      taxable: sum("taxable"), cgst: sum("cgst"), sgst: sum("sgst"), igst: sum("igst"), tax: sum("totalTax"), total: sum("total"),
      rates: [...rate.values()].sort((a, b) => a.gst - b.gst),
      hsn: [...hsn.values()].sort((a, b) => b.taxable - a.taxable),
      b2b: monthInv.filter((i) => i.customer.gstin),
      b2c: monthInv.filter((i) => !i.customer.gstin),
    };
  }, [monthInv]);

  const sales = useMemo(() => {
    const byMode = new Map();
    for (const i of invoices) byMode.set(i.paymentMode, (byMode.get(i.paymentMode) ?? 0) + i.total);
    const byCust = new Map();
    for (const i of invoices) byCust.set(i.customer.name, (byCust.get(i.customer.name) ?? 0) + i.total);
    return {
      trend: salesByDay(invoices, 14, today),
      modes: [...byMode.entries()].map(([name, value]) => ({ name, value })),
      customers: [...byCust.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
      top: topProducts(invoices, 6),
      total: invoices.reduce((s, i) => s + i.total, 0),
    };
  }, [invoices, today]);

  const workerRows = useMemo(
    () => workers.map((w) => {
      const wj = jobs.filter((j) => j.workerId === w.id);
      return { w, jobs: wj.length, issued: wj.reduce((s, j) => s + j.qtyIssued, 0), good: wj.reduce((s, j) => s + j.qtyGood, 0), damaged: wj.reduce((s, j) => s + j.qtyDamaged, 0), ...workerTotals(ledger, w.id) };
    }),
    [workers, jobs, ledger]
  );
  const damageLog = jobs.filter((j) => j.qtyDamaged > 0);

  function exportGST() {
    const rows = [["Invoice", "Date", "Customer", "GSTIN", "Place of supply", "Taxable", "CGST", "SGST", "IGST", "Total"]];
    for (const i of monthInv) rows.push([i.no, i.date, i.customer.name, i.customer.gstin, stateName(i.customer.stateCode), i.taxable, i.cgst, i.sgst, i.igst, i.total]);
    downloadCSV(`gst-sales-${month}.csv`, rows);
  }
  function exportStock() {
    const rows = [["SKU", "Barcode", "Product", "HSN", "GST%", "Stock", "Unit", "Cost", "Price", "Stock value (cost)"]];
    for (const p of products) rows.push([p.sku, p.barcode, p.name, p.hsn, p.gst, p.stock, p.unit, p.cost, p.price, p.cost * p.stock]);
    downloadCSV("stock-report.csv", rows);
  }
  function exportJobs() {
    const rows = [["Karigar", "Jobs", "Pcs issued", "Good", "Damaged", "Wages", "Deductions", "Paid", "Balance"]];
    for (const r of workerRows) rows.push([r.w.name, r.jobs, r.issued, r.good, r.damaged, r.wages, r.deductions, r.paid, r.balance]);
    downloadCSV("jobwork-report.csv", rows);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="card flex w-full gap-1 border border-line p-1.5 sm:w-fit sm:gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-bold transition-all sm:flex-initial sm:flex-row sm:gap-2 sm:px-4 sm:text-xs ${
              tab === t.id
                ? "btn-primary shadow-xs"
                : "text-ink-soft hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <t.icon size={15} />
            <span className="whitespace-nowrap"><span className="sm:hidden">{t.short ?? t.label}</span><span className="hidden sm:inline">{t.label}</span></span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="flex flex-col gap-4">
          {tab === "gst" && (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <select value={month} onChange={(e) => setMonth(e.target.value)} className="input w-full! sm:w-auto!">
                  {months.map((m) => <option key={m} value={m}>{new Date(m + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</option>)}
                </select>
                <Btn variant="outline" onClick={exportGST} className="w-full sm:w-auto">
                  <Download size={14} />
                  <span className="sm:hidden">Download CSV</span>
                  <span className="hidden sm:inline">Download GST sales CSV (for GSTR-1)</span>
                </Btn>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {[["Taxable value", gst.taxable], ["CGST", gst.cgst], ["SGST", gst.sgst], ["IGST", gst.igst], ["Total GST", gst.tax]].map(([k, v], i) => (
                  <div key={k} className={`card px-3.5 py-3 sm:px-4 ${i === 4 ? "order-first col-span-2 border-accent/40 bg-accent-light lg:order-last lg:col-span-1" : ""}`}>
                    <div className="text-[11px] font-semibold text-ink-soft">{k}</div>
                    <div className="mt-1 whitespace-nowrap font-mono text-[17px] font-bold tabular text-ink sm:text-lg">{money(v)}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <SectionCard title="Rate-wise summary" subtitle="By GST rate">
                  <div className="flex flex-col gap-2.5 sm:hidden">
                    {gst.rates.map((r) => (
                      <div key={r.gst} className="rounded-xl bg-surface-2 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="accent">{r.gst}% GST</Badge>
                          <div className="text-right">
                            <div className="text-[10px] font-semibold text-ink-faint">Taxable</div>
                            <div className="font-mono text-sm font-bold tabular text-ink">{money(r.taxable)}</div>
                          </div>
                        </div>
                        <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-line pt-2.5">
                          {[["CGST", r.cgst], ["SGST", r.sgst], ["IGST", r.igst]].map(([k, v]) => (
                            <div key={k}>
                              <div className="text-[10px] font-semibold text-ink-faint">{k}</div>
                              <div className="font-mono text-[11px] font-bold tabular text-ink">{money(v)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="scroll-thin hidden overflow-x-auto sm:block"><table className="w-full whitespace-nowrap text-sm">
                    <thead><tr className="text-left text-xs text-ink-faint"><th className={th}>Rate</th><th className={`${th} text-right`}>Taxable</th><th className={`${th} text-right`}>CGST</th><th className={`${th} text-right`}>SGST</th><th className={`${th} text-right`}>IGST</th></tr></thead>
                    <tbody>
                      {gst.rates.map((r) => (
                        <tr key={r.gst} className="border-t border-line font-mono text-xs tabular">
                          <td className="py-2 font-sans font-semibold"><Badge variant="accent">{r.gst}%</Badge></td>
                          <td className="py-2 text-right">{money(r.taxable)}</td><td className="py-2 text-right">{money(r.cgst)}</td><td className="py-2 text-right">{money(r.sgst)}</td><td className="py-2 text-right">{money(r.igst)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                </SectionCard>

                <SectionCard title="HSN summary" subtitle="GSTR-1 Table 12 format">
                  <div className="flex flex-col gap-2.5 sm:hidden">
                    {gst.hsn.map((h) => (
                      <div key={h.hsn + h.gst} className="rounded-xl bg-surface-2 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-ink">HSN {h.hsn}</span>
                            <Badge variant="neutral">{h.gst}%</Badge>
                          </div>
                          <span className="text-xs font-semibold text-ink-soft">Qty {h.qty}</span>
                        </div>
                        <div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-line pt-2.5">
                          <div>
                            <div className="text-[10px] font-semibold text-ink-faint">Taxable</div>
                            <div className="font-mono text-xs font-bold tabular text-ink">{money(h.taxable)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold text-ink-faint">Tax</div>
                            <div className="font-mono text-xs font-bold tabular text-ink">{money(h.tax)}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="scroll-thin hidden overflow-x-auto sm:block"><table className="w-full whitespace-nowrap text-sm">
                    <thead><tr className="text-left text-xs text-ink-faint"><th className={th}>HSN</th><th className={th}>Rate</th><th className={`${th} text-right`}>Qty</th><th className={`${th} text-right`}>Taxable</th><th className={`${th} text-right`}>Tax</th></tr></thead>
                    <tbody>
                      {gst.hsn.map((h) => (
                        <tr key={h.hsn + h.gst} className="border-t border-line font-mono text-xs tabular">
                          <td className="py-2 font-semibold text-ink">{h.hsn}</td><td className="py-2">{h.gst}%</td><td className="py-2 text-right">{h.qty}</td><td className="py-2 text-right">{money(h.taxable)}</td><td className="py-2 text-right">{money(h.tax)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                </SectionCard>
              </div>

              <SectionCard title="B2B invoices (with GSTIN)" subtitle={`${gst.b2b.length} invoices · B2C: ${gst.b2c.length} invoices, ${money(gst.b2c.reduce((s, i) => s + i.total, 0))}`}>
                {gst.b2b.length === 0 ? <EmptyState title="No B2B invoices this month" /> : (
                  <>
                    <div className="flex flex-col gap-2.5 sm:hidden">
                      {gst.b2b.map((i) => (
                        <div key={i.id} className="rounded-xl bg-surface-2 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="break-all font-mono text-[11px] font-bold text-accent">{i.no}</div>
                              <div className="mt-0.5 text-sm font-bold text-ink">{i.customer.name}</div>
                              <div className="text-[11px] text-ink-faint">{fmtDate(i.date)}</div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="font-mono text-sm font-black tabular text-ink">{money(i.total)}</div>
                              <Badge variant={i.intra ? "good" : "info"} className="mt-1">{i.intra ? "CGST+SGST" : "IGST"}</Badge>
                            </div>
                          </div>
                          <div className="mt-2.5 break-all border-t border-line pt-2.5 font-mono text-[11px] text-ink-soft">{i.customer.gstin}</div>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div><div className="text-[10px] font-semibold text-ink-faint">Taxable</div><div className="font-mono text-xs font-bold tabular text-ink">{money(i.taxable)}</div></div>
                            <div><div className="text-[10px] font-semibold text-ink-faint">GST</div><div className="font-mono text-xs font-bold tabular text-ink">{money(i.totalTax)}</div></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="scroll-thin hidden overflow-x-auto sm:block">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead><tr className="text-left text-xs text-ink-faint"><th className={th}>Invoice</th><th className={th}>Date</th><th className={th}>Customer</th><th className={th}>GSTIN</th><th className={th}>Supply</th><th className={`${th} text-right`}>Taxable</th><th className={`${th} text-right`}>GST</th><th className={`${th} text-right`}>Total</th></tr></thead>
                        <tbody>
                          {gst.b2b.map((i) => (
                            <tr key={i.id} className="border-t border-line text-xs">
                              <td className="py-2 font-mono font-semibold text-accent">{i.no}</td><td className="py-2 text-ink-soft">{fmtDate(i.date)}</td><td className="py-2 text-ink">{i.customer.name}</td>
                              <td className="py-2 font-mono text-ink-soft">{i.customer.gstin}</td><td className="py-2"><Badge variant={i.intra ? "good" : "info"}>{i.intra ? "CGST+SGST" : "IGST"}</Badge></td>
                              <td className="py-2 text-right font-mono tabular">{money(i.taxable)}</td><td className="py-2 text-right font-mono tabular">{money(i.totalTax)}</td><td className="py-2 text-right font-mono font-bold tabular">{money(i.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </SectionCard>
            </>
          )}

          {tab === "sales" && (
            <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <SectionCard title="Daily sales" subtitle={`Total ${formatINR(sales.total)} · ${invoices.length} invoices`} className="xl:col-span-2">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sales.trend} margin={{ left: -14, right: 8, top: 8 }}>
                        <CartesianGrid strokeDasharray="3 5" stroke="var(--c-line)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--c-ink-faint)" }} axisLine={false} tickLine={false} interval={1} />
                        <YAxis tick={{ fontSize: 10, fill: "var(--c-ink-faint)" }} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                        <Tooltip content={<Tip />} cursor={{ fill: "var(--c-surface-2)" }} />
                        <Bar dataKey="sales" name="sales" fill="#0E6E66" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
                <SectionCard title="Payment mode" subtitle="How customers paid">
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={sales.modes} dataKey="value" nameKey="name" innerRadius={42} outerRadius={68} paddingAngle={3}>
                          {sales.modes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<Tip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {sales.modes.map((m, i) => <span key={m.name} className="flex items-center gap-1.5 text-[11px] text-ink-soft"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{m.name}</span>)}
                  </div>
                </SectionCard>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <SectionCard title="Top products">
                  <div className="flex flex-col gap-2.5">
                    {sales.top.map((t) => {
                      const p = products.find((x) => x.id === t.productId);
                      return (
                        <div key={t.productId} className="flex items-center gap-3">
                          {p && <ProductPhoto product={p} size={36} rounded="rounded-lg" />}
                          <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-ink">{t.name}</div><div className="text-[11px] text-ink-faint">{t.qty} pcs sold</div></div>
                          <span className="font-mono text-sm font-bold tabular text-ink">{formatINR(t.revenue)}</span>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
                <SectionCard title="Top customers">
                  <div className="flex flex-col gap-2.5">
                    {sales.customers.map((c) => (
                      <div key={c.name} className="flex items-center gap-3">
                        <Avatar name={c.name} tone={["#3568B0", "#1E3E6B"]} size={34} radius="rounded-full" />
                        <div className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{c.name}</div>
                        <span className="font-mono text-sm font-bold tabular text-ink">{formatINR(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            </>
          )}

          {tab === "stock" && (
            <>
              <div className="flex justify-end"><Btn variant="outline" onClick={exportStock}><Download size={14} /> Stock CSV</Btn></div>
              <SectionCard title="Stock report" subtitle={`Stock value (cost): ${formatINR(products.reduce((s, p) => s + p.cost * p.stock, 0))} · Sale value: ${formatINR(products.reduce((s, p) => s + p.price * p.stock, 0))}`}>
                <div className="overflow-x-auto scroll-thin">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead><tr className="text-left text-xs text-ink-faint"><th className={th}>Product</th><th className={th}>SKU / Barcode</th><th className={`${th} text-center`}>Stock</th><th className={`${th} text-right`}>Cost value</th><th className={`${th} text-right`}>Sale value</th></tr></thead>
                    <tbody>
                      {[...products].sort((a, b) => a.stock / (a.reorder || 1) - b.stock / (b.reorder || 1)).map((p) => (
                        <tr key={p.id} className="border-t border-line">
                          <td className="py-2"><div className="flex items-center gap-2.5"><ProductPhoto product={p} size={32} rounded="rounded-lg" /><span className="font-medium text-ink">{p.name}</span></div></td>
                          <td className="py-2 font-mono text-[11px] text-ink-faint">{p.sku}<div>{p.barcode}</div></td>
                          <td className="py-2 text-center"><Badge variant={p.stock === 0 ? "bad" : isLow(p) ? "warn" : "good"}>{p.stock} {p.unit}</Badge></td>
                          <td className="py-2 text-right font-mono text-xs tabular">{formatINR(p.cost * p.stock)}</td>
                          <td className="py-2 text-right font-mono text-xs font-semibold tabular text-ink">{formatINR(p.price * p.stock)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
              <SectionCard title="Stock movement log" subtitle="Every stock change: scans, sales, job work, audits">
                <div className="overflow-x-auto scroll-thin">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead><tr className="text-left text-xs text-ink-faint"><th className={th}>When</th><th className={th}>Product</th><th className={th}>Type</th><th className={th}>Reference</th><th className={`${th} text-right`}>Change</th><th className={`${th} text-right`}>Balance</th></tr></thead>
                    <tbody>
                      {stockLog.slice(0, 25).map((l) => {
                        const p = products.find((x) => x.id === l.productId);
                        const [label, variant] = TYPE_META[l.type] ?? ["Other", "neutral"];
                        return (
                          <tr key={l.id} className="border-t border-line text-xs">
                            <td className="py-2 whitespace-nowrap text-ink-soft">{fmtDate(l.ts)} {fmtTime(l.ts)}</td>
                            <td className="py-2 text-ink">{p?.name}</td>
                            <td className="py-2"><Badge variant={variant}>{label}</Badge></td>
                            <td className="py-2 font-mono text-ink-faint">{l.ref || "—"}</td>
                            <td className={`py-2 text-right font-mono font-bold tabular ${l.delta > 0 ? "text-good" : l.delta < 0 ? "text-bad" : "text-ink-faint"}`}>{l.delta > 0 ? "+" : ""}{l.delta}</td>
                            <td className="py-2 text-right font-mono tabular text-ink-soft">{l.balance}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </>
          )}

          {tab === "jobwork" && (
            <>
              <div className="flex justify-end"><Btn variant="outline" onClick={exportJobs}><Download size={14} /> Job-work CSV</Btn></div>
              <SectionCard title="Karigar-wise report" subtitle="Work done, damage, wages and balance">
                <div className="overflow-x-auto scroll-thin">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead><tr className="text-left text-xs text-ink-faint"><th className={th}>Karigar</th><th className={`${th} text-center`}>Jobs</th><th className={`${th} text-center`}>Issued</th><th className={`${th} text-center`}>Good</th><th className={`${th} text-center`}>Damaged</th><th className={`${th} text-right`}>Wages</th><th className={`${th} text-right`}>Deducted</th><th className={`${th} text-right`}>Paid</th><th className={`${th} text-right`}>Balance</th></tr></thead>
                    <tbody>
                      {workerRows.map((r) => (
                        <tr key={r.w.id} className="border-t border-line text-xs">
                          <td className="py-2"><div className="flex items-center gap-2.5"><Avatar name={r.w.name} tone={r.w.tone} size={28} radius="rounded-full" /><div><div className="text-sm font-medium text-ink">{r.w.name}</div><div className="text-[10px] text-ink-faint">{r.w.specialty}</div></div></div></td>
                          <td className="py-2 text-center font-mono">{r.jobs}</td><td className="py-2 text-center font-mono">{r.issued}</td><td className="py-2 text-center font-mono text-good">{r.good}</td>
                          <td className="py-2 text-center">{r.damaged ? <Badge variant="bad">{r.damaged}</Badge> : <span className="text-ink-faint">0</span>}</td>
                          <td className="py-2 text-right font-mono tabular">{formatINR(r.wages)}</td><td className="py-2 text-right font-mono tabular text-bad">{r.deductions ? "−" + formatINR(r.deductions) : "—"}</td><td className="py-2 text-right font-mono tabular text-good">{formatINR(r.paid)}</td>
                          <td className={`py-2 text-right font-mono font-bold tabular ${r.balance > 0 ? "text-bad" : "text-ink"}`}>{formatINR(r.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
              <SectionCard title="Damage register" subtitle="Which karigar damaged which item">
                {damageLog.length === 0 ? <EmptyState title="No damage recorded" /> : (
                  <div className="flex flex-col gap-2">
                    {damageLog.map((j) => {
                      const w = workers.find((x) => x.id === j.workerId);
                      const p = products.find((x) => x.id === j.productId);
                      if (!w || !p) return null;
                      return (
                        <div key={j.id} className="flex items-center gap-3 rounded-lg bg-surface-2 px-3 py-2.5">
                          <ProductPhoto product={p} size={38} rounded="rounded-lg" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-ink">{p.name} <span className="font-mono text-[11px] text-ink-faint">{j.challanNo}</span></div>
                            <div className="text-[11px] text-ink-faint">{w.name} · {j.damageNote || "No reason noted"}</div>
                          </div>
                          <Badge variant="bad">{j.qtyDamaged} pcs damaged</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </>
          )}
        </motion.div>
      </AnimatePresence>
      <div className="text-center text-[11px] text-ink-faint">{business.name} · GSTIN {business.gstin}</div>
    </div>
  );
}
