import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { buildSeed } from "./seed.js";
import {
  opAddProduct,
  opUpdateProduct,
  opAdjustStock,
  opAddWorker,
  opAddCustomer,
  opIssueJob,
  opReceiveJob,
  opAddPayment,
  opCreateInvoice,
  opMarkInvoicePaid,
} from "./ops.js";
import { todayISO } from "./format.js";

const DATA_KEYS = ["seq", "business", "products", "workers", "customers", "jobs", "ledger", "invoices", "stockLog", "counters"];
const nowISO = () => new Date().toISOString();
const pickData = (s) => Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]]));

export const useStore = create(
  persist(
    (set, get) => ({
      ...buildSeed(),
      lastId: null,

      addProduct(d) {
        set((s) => opAddProduct(s, { ...d, ts: nowISO() }));
        const s = get();
        return s.products.find((p) => p.id === s.lastId);
      },
      updateProduct(id, patch) {
        set((s) => opUpdateProduct(s, id, patch));
      },
      adjustStock({ productId, delta, type = "adjust", reason }) {
        set((s) => opAdjustStock(s, { productId, delta, type, reason, ts: nowISO() }));
      },
      applyStockCounts(counts) {
        set((s) => {
          let next = s;
          for (const [productId, counted] of Object.entries(counts)) {
            const p = next.products.find((x) => x.id === productId);
            if (p && p.stock !== counted) {
              next = opAdjustStock(next, { productId, delta: counted - p.stock, type: "audit", reason: "Stock audit correction", ts: nowISO() });
            }
          }
          return next;
        });
      },

      addWorker(d) {
        set((s) => opAddWorker(s, d));
        return get().workers.find((w) => w.id === get().lastId);
      },
      addCustomer(d) {
        set((s) => opAddCustomer(s, d));
        return get().customers.find((c) => c.id === get().lastId);
      },

      issueJob(d) {
        const p = get().products.find((x) => x.id === d.productId);
        if (!p) return { ok: false, error: "Select a product" };
        if (!d.workerId) return { ok: false, error: "Select a karigar" };
        if (!(d.qty > 0)) return { ok: false, error: "Enter a quantity" };
        if (d.qty > p.stock) return { ok: false, error: `Only ${p.stock} ${p.unit} in stock` };
        set((s) => opIssueJob(s, { ...d, date: todayISO(), ts: nowISO() }));
        return { ok: true, job: get().jobs.find((j) => j.id === get().lastId) };
      },
      receiveJob(d) {
        const job = get().jobs.find((j) => j.id === d.jobId);
        if (!job) return { ok: false, error: "Job not found" };
        const good = d.good || 0;
        const damaged = d.damaged || 0;
        if (good + damaged <= 0) return { ok: false, error: "Enter good or damaged quantity" };
        if (good + damaged > job.qtyIssued - job.qtyGood - job.qtyDamaged) return { ok: false, error: "Cannot exceed the pending quantity" };
        set((s) => opReceiveJob(s, { ...d, date: todayISO(), ts: nowISO() }));
        return { ok: true };
      },
      addPayment(d) {
        if (!(d.amount > 0)) return { ok: false, error: "Enter an amount" };
        set((s) => opAddPayment(s, { ...d, date: todayISO(), ts: nowISO() }));
        return { ok: true };
      },

      createInvoice(d) {
        if (!d.items.length) return { ok: false, error: "The bill has no products" };
        for (const it of d.items) {
          const p = get().products.find((x) => x.id === it.productId);
          if (!p || it.qty > p.stock) return { ok: false, error: `${p?.name ?? "Product"}: only ${p?.stock ?? 0} in stock` };
        }
        set((s) => opCreateInvoice(s, { ...d, date: todayISO(), ts: nowISO() }));
        return { ok: true, invoice: get().invoices.find((i) => i.id === get().lastId) };
      },
      markInvoicePaid(id) {
        set((s) => opMarkInvoicePaid(s, id));
      },

      resetAll() {
        set(buildSeed());
      },
    }),
    {
      name: "harsh-inventory-v1",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: pickData,
      merge: (persisted, current) => ({ ...current, ...persisted, business: current.business }),
      migrate: () => pickData(buildSeed()),
    }
  )
);
