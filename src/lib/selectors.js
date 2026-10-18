import { addDays, daysBetween } from "./format.js";

export const isLow = (p) => p.stock <= p.reorder;

export function workerStatement(ledger, workerId) {
  const rows = ledger
    .filter((l) => l.workerId === workerId)
    .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));
  let bal = 0;
  return rows.map((l) => {
    bal += l.type === "wage" ? l.amount : -l.amount;
    return { ...l, balance: bal };
  });
}

export function workerTotals(ledger, workerId) {
  let wages = 0;
  let deductions = 0;
  let paid = 0;
  for (const l of ledger) {
    if (l.workerId !== workerId) continue;
    if (l.type === "wage") wages += l.amount;
    else if (l.type === "deduction") deductions += l.amount;
    else paid += l.amount;
  }
  return { wages, deductions, paid, balance: wages - deductions - paid };
}

export function jobInfo(job, today) {
  const remaining = job.qtyIssued - job.qtyGood - job.qtyDamaged;
  const open = job.status !== "completed";
  const lateBy = open && job.dueDate < today ? daysBetween(job.dueDate, today) : 0;
  return { remaining, open, overdue: lateBy > 0, lateBy };
}

export function salesByDay(invoices, days, today) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const day = invoices.filter((inv) => inv.date === date);
    out.push({
      date,
      label: new Date(date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      sales: day.reduce((s, inv) => s + inv.total, 0),
      tax: day.reduce((s, inv) => s + inv.totalTax, 0),
      count: day.length,
    });
  }
  return out;
}

export function topProducts(invoices, limit = 5) {
  const map = new Map();
  for (const inv of invoices) {
    for (const it of inv.items) {
      const row = map.get(it.productId) ?? { productId: it.productId, name: it.name, qty: 0, revenue: 0 };
      row.qty += it.qty;
      row.revenue += it.taxable;
      map.set(it.productId, row);
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function monthOf(iso) {
  return iso.slice(0, 7);
}
