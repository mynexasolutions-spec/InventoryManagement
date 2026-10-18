// Pure state transitions. Each op takes the whole state and returns a new one (no Date.now / random inside),
// so the same ops build the seed data and run the live app.

import { nextBarcode } from "./barcode.js";
import { computeInvoice } from "./gst.js";
import { financialYear } from "./format.js";

export const TONES = [
  ["#0E6E66", "#123F3B"],
  ["#C97E2E", "#7A4A16"],
  ["#3568B0", "#1E3E6B"],
  ["#8A4FB0", "#4E2A66"],
  ["#B33A3A", "#6E2222"],
  ["#2F7A4F", "#1B4A30"],
];

const MAX_LOG = 300;

function nextId(s, prefix) {
  const seq = s.seq + 1;
  return [prefix + seq, { ...s, seq }];
}

export function opAdjustStock(s, { productId, delta, type, reason, ref = "", ts }) {
  const product = s.products.find((p) => p.id === productId);
  if (!product) return s;
  const balance = product.stock + delta;
  const [id, s1] = nextId(s, "sl");
  const entry = { id, ts, productId, delta, balance, type, reason, ref };
  return {
    ...s1,
    products: s1.products.map((p) => (p.id === productId ? { ...p, stock: balance } : p)),
    stockLog: [entry, ...s1.stockLog].slice(0, MAX_LOG),
  };
}

export function opAddProduct(s, d) {
  const [id, s1] = nextId(s, "p");
  const prefix = d.category.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  const maxSeq = s1.products
    .filter((p) => p.sku.startsWith(prefix + "-"))
    .reduce((m, p) => Math.max(m, Number(p.sku.split("-")[1]) || 0), 0);
  const product = {
    id,
    name: d.name,
    category: d.category,
    hsn: d.hsn,
    gst: d.gst,
    price: d.price,
    cost: d.cost ?? 0,
    stock: 0,
    reorder: d.reorder ?? 5,
    unit: d.unit ?? "pcs",
    photo: d.photo ?? null,
    tone: d.tone ?? TONES[s1.products.length % TONES.length],
    sku: `${prefix}-${String(maxSeq + 1).padStart(4, "0")}`,
    barcode: d.barcode || nextBarcode(s1.products.map((p) => p.barcode)),
    createdAt: d.ts,
  };
  let next = { ...s1, products: d.append ? [...s1.products, product] : [product, ...s1.products] };
  if (d.stock > 0) next = opAdjustStock(next, { productId: id, delta: d.stock, type: "opening", reason: "Opening stock", ts: d.ts });
  return { ...next, lastId: id };
}

export function opUpdateProduct(s, id, patch) {
  return { ...s, products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
}

export function opAddWorker(s, d) {
  const [id, s1] = nextId(s, "w");
  const worker = { id, name: d.name, phone: d.phone ?? "", specialty: d.specialty ?? "", rate: d.rate ?? 0, tone: d.tone ?? TONES[s1.workers.length % TONES.length] };
  return { ...s1, workers: [...s1.workers, worker], lastId: id };
}

export function opAddCustomer(s, d) {
  const [id, s1] = nextId(s, "c");
  const customer = { id, name: d.name, gstin: d.gstin ?? "", stateCode: d.stateCode, phone: d.phone ?? "", address: d.address ?? "" };
  return { ...s1, customers: [...s1.customers, customer], lastId: id };
}

export function opIssueJob(s, d) {
  const [id, s1] = nextId(s, "j");
  const challanNo = `JW-${String(s1.counters.challan + 1).padStart(4, "0")}`;
  const job = {
    id,
    challanNo,
    productId: d.productId,
    workerId: d.workerId,
    qtyIssued: d.qty,
    qtyGood: 0,
    qtyDamaged: 0,
    rate: d.rate,
    dateIssued: d.date,
    dueDate: d.dueDate,
    note: d.note ?? "",
    status: "issued",
    closedOn: null,
  };
  const next = { ...s1, jobs: [job, ...s1.jobs], counters: { ...s1.counters, challan: s1.counters.challan + 1 } };
  const withStock = opAdjustStock(next, { productId: d.productId, delta: -d.qty, type: "job-out", reason: "Issued to karigar", ref: challanNo, ts: d.ts });
  return { ...withStock, lastId: id };
}

export function opReceiveJob(s, d) {
  const job = s.jobs.find((j) => j.id === d.jobId);
  if (!job) return s;
  const good = d.good || 0;
  const damaged = d.damaged || 0;
  const qtyGood = job.qtyGood + good;
  const qtyDamaged = job.qtyDamaged + damaged;
  const done = qtyGood + qtyDamaged >= job.qtyIssued;
  let next = {
    ...s,
    jobs: s.jobs.map((j) =>
      j.id === job.id ? { ...j, qtyGood, qtyDamaged, status: done ? "completed" : "partial", closedOn: done ? d.date : null, damageNote: d.damageNote || j.damageNote || "" } : j
    ),
  };
  if (good > 0) next = opAdjustStock(next, { productId: job.productId, delta: good, type: "job-in", reason: "Received from karigar", ref: job.challanNo, ts: d.ts });
  if (damaged > 0) {
    const [lid, s2] = nextId(next, "sl");
    const product = next.products.find((p) => p.id === job.productId);
    next = {
      ...s2,
      stockLog: [{ id: lid, ts: d.ts, productId: job.productId, delta: 0, balance: product.stock, type: "damage", reason: `${damaged} pcs damaged${d.damageNote ? " — " + d.damageNote : ""}`, ref: job.challanNo }, ...s2.stockLog].slice(0, MAX_LOG),
    };
  }
  const entries = [];
  if (good > 0) entries.push({ type: "wage", amount: good * job.rate, note: `${job.challanNo} · ${good} pcs × ₹${job.rate}` });
  if ((d.deduction || 0) > 0) entries.push({ type: "deduction", amount: d.deduction, note: `${job.challanNo} · ${damaged} pcs damaged${d.damageNote ? " (" + d.damageNote + ")" : ""}` });
  for (const e of entries) {
    const [lid, s2] = nextId(next, "l");
    next = { ...s2, ledger: [...s2.ledger, { id: lid, workerId: job.workerId, jobId: job.id, date: d.date, ts: d.ts, ...e }] };
  }
  return next;
}

export function opAddPayment(s, d) {
  const [id, s1] = nextId(s, "l");
  const entry = { id, workerId: d.workerId, jobId: d.jobId ?? null, date: d.date, ts: d.ts, type: "payment", amount: d.amount, mode: d.mode, note: d.note || "Payment" };
  return { ...s1, ledger: [...s1.ledger, entry], lastId: id };
}

export function opCreateInvoice(s, d) {
  const customer = d.customer;
  const intra = (customer.stateCode || s.business.stateCode) === s.business.stateCode;
  const items = d.items.map((it) => {
    const p = s.products.find((x) => x.id === it.productId);
    return { productId: p.id, name: p.name, sku: p.sku, hsn: p.hsn, gst: p.gst, unit: p.unit, qty: it.qty, rate: it.rate ?? p.price, discountPct: it.discountPct || 0 };
  });
  const calc = computeInvoice(items, intra);
  const n = s.counters.invoice + 1;
  const no = `INV/${financialYear(d.date)}/${String(n).padStart(4, "0")}`;
  const [id, s1] = nextId(s, "inv");
  const { lines, ...totals } = calc;
  const invoice = {
    id,
    no,
    date: d.date,
    ts: d.ts,
    customer,
    intra,
    items: lines,
    ...totals,
    paymentMode: d.paymentMode,
    status: d.paymentMode === "Credit" ? "unpaid" : "paid",
    note: d.note ?? "",
  };
  let next = { ...s1, invoices: [invoice, ...s1.invoices], counters: { ...s1.counters, invoice: n } };
  for (const it of items) {
    next = opAdjustStock(next, { productId: it.productId, delta: -it.qty, type: "sale", reason: "Sale", ref: no, ts: d.ts });
  }
  return { ...next, lastId: id };
}

export function opMarkInvoicePaid(s, id) {
  return { ...s, invoices: s.invoices.map((i) => (i.id === id ? { ...i, status: "paid" } : i)) };
}
