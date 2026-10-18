// Realistic starting data, built by replaying the same ops the live app uses (so stock, ledger and invoices always agree).

import { makeGSTIN } from "./gst.js";
import { addDays, todayISO } from "./format.js";
import {
  TONES,
  opAddProduct,
  opAddWorker,
  opAddCustomer,
  opIssueJob,
  opReceiveJob,
  opAddPayment,
  opCreateInvoice,
} from "./ops.js";

export const BUSINESS = {
  name: "Nexa Solutions",
  gstin: makeGSTIN("24", "ABCPH1234F"),
  stateCode: "24",
  address: "Plot 22, Ring Road Textile Market, Surat - 395002",
  phone: "98250 12345",
  upi: "nexasolutions@upi",
};

const emptyState = () => ({
  seq: 0,
  business: BUSINESS,
  products: [],
  workers: [],
  customers: [],
  jobs: [],
  ledger: [],
  invoices: [],
  stockLog: [],
  counters: { invoice: 0, challan: 0 },
  lastId: null,
});

const at = (date, hm = "11:30") => `${date}T${hm}:00`;

export function buildSeed(today = todayISO()) {
  const d = (n) => addDays(today, n);
  let s = emptyState();

  const products = [
    ["Banarasi Silk Saree", "Saree", "5007", 5, 4200, 3100, 30, 8, 0],
    ["Kanjeevaram Bridal Saree", "Saree", "5007", 5, 9800, 7400, 14, 4, 4],
    ["Georgette Lehenga Set", "Lehenga", "6204", 18, 6500, 4600, 18, 5, 3],
    ["Cotton Printed Kurti", "Kurti", "6204", 5, 850, 520, 70, 15, 2],
    ["Chiffon Embroidered Dupatta", "Dupatta", "6214", 5, 650, 380, 18, 8, 3],
    ["Raw Silk Blouse Piece", "Blouse", "6206", 5, 420, 250, 45, 10, 5],
    ["Mysore Silk Fabric", "Fabric Roll", "5007", 5, 1200, 880, 40, 10, 1, "mtr"],
    ["Organza Party Saree", "Saree", "5007", 5, 3100, 2200, 9, 6, 1],
    ["Patola Silk Saree", "Saree", "5007", 5, 7800, 5900, 7, 4, 4],
    ["Anarkali Kurti Set", "Kurti", "6204", 18, 2800, 1900, 20, 6, 5],
    ["Bandhani Dupatta", "Dupatta", "6214", 5, 480, 290, 35, 10, 1],
    ["Zari Border Blouse", "Blouse", "6206", 5, 560, 340, 28, 8, 2],
  ];
  products.forEach(([name, category, hsn, gst, price, cost, stock, reorder, tone, unit], i) => {
    s = opAddProduct(s, { name, category, hsn, gst, price, cost, stock, reorder, unit: unit ?? "pcs", tone: TONES[tone % TONES.length], append: true, ts: at(d(-30)) });
  });
  const P = (i) => s.products[i].id;

  [
    ["Imran Sheikh", "Embroidery", "98200 11223", 180],
    ["Ravi Patil", "Dyeing", "98200 44556", 60],
    ["Fatima Ansari", "Stitching", "98200 77889", 150],
    ["Suresh Yadav", "Zari Work", "98200 99001", 220],
    ["Kamlesh Rathod", "Finishing", "98200 33445", 40],
  ].forEach(([name, specialty, phone, rate]) => {
    s = opAddWorker(s, { name, specialty, phone, rate });
  });
  const W = (i) => s.workers[i].id;

  s = opAddCustomer(s, { name: "Walk-in Customer", stateCode: "24" });
  [
    ["Meera Textiles", makeGSTIN("24", "AAAFM2345K"), "24", "98250 55512"],
    ["Delhi Wholesale Fab", makeGSTIN("07", "AABCD5678L"), "07", "98110 22334"],
    ["Rahul Boutique Co.", makeGSTIN("27", "AAHFR9012M"), "27", "98670 44221"],
    ["Priya Sharma", "", "24", "98240 11990"],
    ["Anjali Verma", "", "24", "98791 66002"],
  ].forEach(([name, gstin, stateCode, phone]) => {
    s = opAddCustomer(s, { name, gstin, stateCode, phone });
  });
  const C = (i) => {
    const c = s.customers[i];
    return { name: c.name, gstin: c.gstin, stateCode: c.stateCode, phone: c.phone, address: c.address };
  };

  // ---- job work (issue -> receive -> pay) ----
  s = opIssueJob(s, { productId: P(0), workerId: W(0), qty: 6, rate: 180, date: d(-9), dueDate: d(3), note: "Zari butti work", ts: at(d(-9), "10:00") });
  const j1 = s.lastId;
  s = opIssueJob(s, { productId: P(2), workerId: W(3), qty: 4, rate: 220, date: d(-13), dueDate: d(-4), note: "Border zari", ts: at(d(-13), "10:00") });
  const j2 = s.lastId;
  s = opIssueJob(s, { productId: P(4), workerId: W(1), qty: 10, rate: 60, date: d(-6), dueDate: d(-1), note: "Bandhani dye", ts: at(d(-6), "10:00") });
  const j3 = s.lastId;
  s = opIssueJob(s, { productId: P(1), workerId: W(2), qty: 3, rate: 150, date: d(-4), dueDate: d(2), note: "Blouse stitching", ts: at(d(-4), "10:00") });
  s = opIssueJob(s, { productId: P(7), workerId: W(0), qty: 5, rate: 180, date: d(-20), dueDate: d(-12), note: "Thread embroidery", ts: at(d(-20), "10:00") });
  const j5 = s.lastId;
  s = opIssueJob(s, { productId: P(9), workerId: W(2), qty: 6, rate: 150, date: d(-10), dueDate: d(-2), note: "Stitching", ts: at(d(-10), "10:00") });
  const j6 = s.lastId;

  s = opReceiveJob(s, { jobId: j5, good: 5, damaged: 0, deduction: 0, date: d(-12), ts: at(d(-12), "16:00") });
  s = opReceiveJob(s, { jobId: j2, good: 4, damaged: 0, deduction: 0, date: d(-5), ts: at(d(-5), "16:00") });
  s = opReceiveJob(s, { jobId: j3, good: 8, damaged: 2, damageNote: "Dye bleed", deduction: 300, date: d(-2), ts: at(d(-2), "16:00") });
  s = opReceiveJob(s, { jobId: j1, good: 3, damaged: 0, deduction: 0, date: d(-3), ts: at(d(-3), "16:00") });
  s = opReceiveJob(s, { jobId: j6, good: 2, damaged: 0, deduction: 0, date: d(-6), ts: at(d(-6), "16:00") });

  s = opAddPayment(s, { workerId: W(0), amount: 900, mode: "UPI", note: "Challan JW-0005 wages", date: d(-11), ts: at(d(-11), "17:00") });
  s = opAddPayment(s, { workerId: W(0), amount: 300, mode: "Cash", note: "Advance", date: d(-3), ts: at(d(-3), "17:00") });
  s = opAddPayment(s, { workerId: W(3), amount: 500, mode: "Cash", note: "Part payment", date: d(-4), ts: at(d(-4), "17:00") });
  s = opAddPayment(s, { workerId: W(1), amount: 100, mode: "Cash", note: "Part payment", date: d(-1), ts: at(d(-1), "17:00") });

  // ---- sales: [dayOffset, customerIdx, [[productIdx, qty, discountPct]], paymentMode] ----
  const sales = [
    [-13, 1, [[0, 3, 0], [4, 6, 5]], "UPI"],
    [-12, 0, [[3, 2, 0]], "Cash"],
    [-11, 2, [[2, 2, 0]], "Bank Transfer"],
    [-10, 4, [[5, 3, 0], [10, 2, 0]], "Cash"],
    [-9, 1, [[1, 2, 2]], "Bank Transfer"],
    [-8, 0, [[3, 4, 0], [11, 2, 0]], "UPI"],
    [-7, 3, [[7, 1, 0]], "Card"],
    [-6, 2, [[0, 2, 0], [6, 8, 0]], "Credit"],
    [-5, 0, [[8, 1, 0]], "UPI"],
    [-4, 1, [[3, 10, 0], [5, 6, 3]], "Bank Transfer"],
    [-3, 4, [[2, 1, 0]], "Cash"],
    [-2, 0, [[10, 3, 0], [4, 2, 0]], "UPI"],
    [-2, 3, [[9, 1, 0]], "Card"],
    [-1, 2, [[7, 3, 0], [8, 2, 0]], "Bank Transfer"],
    [-1, 0, [[11, 2, 0], [3, 1, 0]], "Cash"],
    [0, 1, [[0, 4, 2], [6, 6, 0]], "UPI"],
    [0, 0, [[5, 2, 0]], "Cash"],
  ];
  for (const [off, ci, items, mode] of sales) {
    s = opCreateInvoice(s, {
      date: d(off),
      ts: at(d(off), off % 2 ? "12:15" : "17:40"),
      customer: C(ci),
      items: items.map(([pi, qty, discountPct]) => ({ productId: P(pi), qty, discountPct })),
      paymentMode: mode,
    });
  }

  return s;
}
