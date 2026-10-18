"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Plus, Minus, Trash2, ReceiptText, UserPlus, Check, FileText, BadgeCheck, RotateCcw, ShoppingBag, Banknote, QrCode, CreditCard, Building2, Clock, UserCheck, Tag, ShieldCheck, X } from "lucide-react";
import ProductPhoto from "@/components/ProductPhoto";
import Badge from "@/components/Badge";
import Drawer from "@/components/Drawer";
import ScanBar from "@/components/ScanBar";
import InvoiceDoc from "@/components/InvoiceDoc";
import PrintableModal from "@/components/PrintableModal";
import { useScanHandler, beep } from "@/components/ScanProvider";
import { Btn, Field, EmptyState } from "@/components/ui";
import { useStore } from "@/lib/store";
import { findProductByCode, normalizeCode } from "@/lib/barcode";
import { computeInvoice, validateGSTIN, STATES, stateName } from "@/lib/gst";
import { formatINR, formatINR2, fmtDate } from "@/lib/format";
import { isLow } from "@/lib/selectors";
import { useToast } from "@/lib/useToast";
import { useBodyLock } from "@/lib/useBodyLock";

const PAY_MODES = [
  { id: "Cash", label: "Cash", icon: Banknote },
  { id: "UPI", label: "UPI", icon: QrCode },
  { id: "Card", label: "Card", icon: CreditCard },
  { id: "Bank Transfer", label: "Bank", icon: Building2 },
  { id: "Credit", label: "Credit", icon: Clock },
];

export default function BillingView() {
  const products = useStore((s) => s.products);
  const customers = useStore((s) => s.customers);
  const invoices = useStore((s) => s.invoices);
  const business = useStore((s) => s.business);
  const createInvoice = useStore((s) => s.createInvoice);
  const addCustomer = useStore((s) => s.addCustomer);
  const markInvoicePaid = useStore((s) => s.markInvoicePaid);
  const { fire, node: toast } = useToast();

  const [tab, setTab] = useState("new");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [payMode, setPayMode] = useState("Cash");
  const [flashId, setFlashId] = useState(null);
  const [done, setDone] = useState(null);
  const [billOpen, setBillOpen] = useState(false);
  useBodyLock(billOpen);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [custOpen, setCustOpen] = useState(false);
  const [cust, setCust] = useState({ name: "", phone: "", gstin: "", stateCode: business.stateCode });

  const customer = customers.find((c) => c.id === customerId) ?? customers[0];
  const intra = (customer?.stateCode || business.stateCode) === business.stateCode;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return products.filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [products, query]);

  const lines = cart.map((l) => ({ ...l, product: products.find((p) => p.id === l.productId) })).filter((l) => l.product);
  const calc = computeInvoice(lines.map((l) => ({ productId: l.productId, qty: l.qty, rate: l.product.price, discountPct: l.discountPct, gst: l.product.gst, hsn: l.product.hsn })), intra);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);

  function addToCart(p) {
    const live = useStore.getState().products.find((x) => x.id === p.id);
    const inCart = cart.find((l) => l.productId === p.id)?.qty ?? 0;
    if (!live || live.stock <= inCart) {
      beep(false, `Out of stock: ${p.name}`);
      fire("Out of stock", `${p.name}: only ${live?.stock ?? 0} ${p.unit} left`);
      return;
    }
    beep(true, `Added: ${p.name}`);
    setCart((c) => (c.some((l) => l.productId === p.id) ? c.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l)) : [...c, { productId: p.id, qty: 1, discountPct: 0 }]));
    setFlashId(p.id);
    setTimeout(() => setFlashId((f) => (f === p.id ? null : f)), 700);
  }

  function onScan(code) {
    const p = findProductByCode(useStore.getState().products, code);
    if (!p) {
      beep(false, `Barcode not found: ${normalizeCode(code)}`);
      fire("Barcode not found", `${normalizeCode(code)} is not linked to any product`);
      return;
    }
    addToCart(p);
  }
  useScanHandler(custOpen || done || viewInvoice ? null : onScan);

  function setQty(id, qty) {
    const p = products.find((x) => x.id === id);
    const q = Math.max(1, Math.min(p.stock, qty));
    setCart((c) => c.map((l) => (l.productId === id ? { ...l, qty: q } : l)));
  }

  function generate() {
    const res = createInvoice({
      customer: { name: customer.name, gstin: customer.gstin, stateCode: customer.stateCode, phone: customer.phone, address: customer.address },
      items: cart.map((l) => ({ productId: l.productId, qty: l.qty, discountPct: l.discountPct })),
      paymentMode: payMode,
    });
    if (!res.ok) {
      beep(false);
      fire("Could not create invoice", res.error);
      return;
    }
    beep(true);
    setDone(res.invoice);
    setCart([]);
    setBillOpen(false);
  }

  function saveCustomer() {
    if (!cust.name.trim()) return;
    const v = validateGSTIN(cust.gstin);
    if (!v.ok) return;
    const c = addCustomer({ name: cust.name.trim(), phone: cust.phone, gstin: cust.gstin.trim().toUpperCase(), stateCode: v.stateCode ?? cust.stateCode });
    setCustomerId(c.id);
    setCustOpen(false);
    setCust({ name: "", phone: "", gstin: "", stateCode: business.stateCode });
    fire("Customer added", c.name);
  }
  const gstinCheck = validateGSTIN(cust.gstin);

  return (
    <div className="flex flex-col gap-5">
      <div className="card flex w-fit gap-1 p-1.5">
        {[["new", "New bill", ReceiptText], ["list", `Invoices (${invoices.length})`, FileText]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className="relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold">
            {tab === id && <motion.span layoutId="bill-tab" className="absolute inset-0 rounded-xl bg-accent-solid shadow-md" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <Icon size={15} className={`relative ${tab === id ? "text-white" : "text-ink-faint"}`} />
            <span className={`relative ${tab === id ? "text-white" : "text-ink-soft"}`}>{label}</span>
          </button>
        ))}
      </div>

      {tab === "new" ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          <div className="flex flex-col gap-4 xl:col-span-3">
            <ScanBar onScan={onScan} autoFocus placeholder="Scan a product to add it to the bill" cameraTitle="Scan products for this bill" cameraHint="The camera stays open. Scan one item after another." />
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Or search by name or SKU…" className="input pl-9!" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filtered.map((p) => (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ y: -3 }}
                  disabled={p.stock === 0}
                  onClick={() => addToCart(p)}
                  className="card card-lift group relative flex flex-col overflow-hidden text-left border border-line disabled:opacity-50"
                >
                  <div className="relative overflow-hidden bg-surface-2">
                    <ProductPhoto
                      product={p}
                      size={320}
                      rounded="rounded-none"
                      className="h-32! w-full! object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-slate-900/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                      {p.category}
                    </span>
                    <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white opacity-100 shadow-md transition-all md:opacity-0 md:group-hover:opacity-100 md:group-hover:scale-110">
                      <Plus size={15} strokeWidth={3} />
                    </span>
                  </div>
                  <div className="p-3">
                    <div className="truncate text-xs font-bold text-ink">{p.name}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-mono text-sm font-black tabular text-ink">{formatINR(p.price)}</span>
                      <Badge variant={p.stock === 0 ? "bad" : isLow(p) ? "warn" : "neutral"} className="text-[10px]">
                        {p.stock === 0 ? "Out" : `${p.stock} ${p.unit}`}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-ink-faint font-mono">
                      <span>{p.sku}</span>
                      <span className="text-accent font-semibold">GST {p.gst}%</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <div id="current-bill" className={`${billOpen ? "flex" : "hidden"} card max-xl:fixed max-xl:inset-0 max-xl:z-[55] max-xl:overflow-y-auto max-xl:rounded-none! max-xl:border-0 max-xl:pb-24 xl:flex flex-col gap-4 p-4 sm:p-6 xl:sticky xl:top-24 xl:col-span-2 xl:self-start border border-line shadow-md`}>
            {/* Phone: the bill opens as a full page, with its own close button */}
            <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-1 flex items-center justify-between border-b border-line bg-surface px-4 py-3 xl:hidden">
              <span className="font-display text-base font-black text-ink">Review bill</span>
              <button onClick={() => setBillOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-ink-soft" aria-label="Close bill"><X size={18} /></button>
            </div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line/70 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-light text-accent border border-accent/20">
                  <ShoppingBag size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-black text-ink">Current Bill</h2>
                    {itemCount > 0 && (
                      <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[11px] font-extrabold text-white shadow-2xs">
                        {itemCount} {itemCount === 1 ? "item" : "items"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-ink-soft">POS Counter • Quick GST Checkout</p>
                </div>
              </div>
              {lines.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Customer Selector Card */}
            <div className="rounded-xl border border-line bg-surface-2/60 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-xs font-bold text-ink-soft">
                  <UserCheck size={13} className="text-accent" /> Customer Details
                </span>
                <button
                  onClick={() => setCustOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:text-accent-dark transition-colors"
                >
                  <UserPlus size={12} /> + New Customer
                </button>
              </div>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="input bg-surface font-semibold text-xs py-2! pr-8!"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.gstin ? "• [GST Registered]" : ""}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                {customer?.gstin && (
                  <span className="rounded-md bg-surface px-2 py-0.5 font-mono text-[10px] font-bold text-ink-soft border border-line">
                    GSTIN: {customer.gstin}
                  </span>
                )}
                <Badge variant={intra ? "good" : "info"} className="text-[10px] py-0.5">
                  <ShieldCheck size={11} /> {intra ? "CGST + SGST (Intra-State)" : "IGST (Inter-State)"} • {stateName(customer?.stateCode || business.stateCode)}
                </Badge>
              </div>
            </div>

            {/* Cart Line Items */}
            <div className="scroll-thin flex max-h-85 min-h-32 flex-col gap-2.5 overflow-y-auto pr-1 max-xl:max-h-none max-xl:shrink-0 max-xl:overflow-visible">
              {lines.length === 0 && (
                <EmptyState icon={ReceiptText} title="The bill is empty" text="Scan a barcode or tap any product from the catalog." />
              )}
              <AnimatePresence initial={false}>
                {lines.map((l) => (
                  <motion.div
                    key={l.productId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      backgroundColor: flashId === l.productId ? "var(--c-accent-light)" : "var(--color-surface)",
                    }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group relative flex shrink-0 flex-col gap-2.5 rounded-xl border border-line p-3 shadow-2xs transition-[border-color,box-shadow] hover:border-accent/40 hover:shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      <ProductPhoto
                        product={l.product}
                        size={52}
                        rounded="rounded-xl"
                        className="border border-line shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-ink">{l.product.name}</div>
                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-ink-faint mt-0.5">
                              <span>{formatINR(l.product.price)} each</span>
                              <span>•</span>
                              <span className="text-accent font-semibold">GST {l.product.gst}%</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono text-sm font-black tabular text-ink">
                              {formatINR(calc.lines.find((x) => x.productId === l.productId)?.lineTotal ?? 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stepper, Discount, Remove */}
                    <div className="flex items-center justify-between border-t border-line/60 pt-2 text-xs">
                      {/* Quantity Stepper */}
                      <div className="flex items-center rounded-lg border border-line bg-surface-2 p-0.5 shadow-2xs">
                        <button
                          onClick={() =>
                            l.qty === 1
                              ? setCart((c) => c.filter((x) => x.productId !== l.productId))
                              : setQty(l.productId, l.qty - 1)
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-surface text-ink-soft hover:bg-white hover:text-ink hover:shadow-xs transition-all active:scale-90"
                          aria-label="Less"
                        >
                          <Minus size={11} strokeWidth={2.5} />
                        </button>
                        <span className="w-7 text-center font-mono text-xs font-extrabold tabular text-ink">
                          {l.qty}
                        </span>
                        <button
                          onClick={() => setQty(l.productId, l.qty + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-surface text-ink-soft hover:bg-white hover:text-ink hover:shadow-xs transition-all active:scale-90"
                          aria-label="More"
                        >
                          <Plus size={11} strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* Discount Pill */}
                      <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-2 px-2 py-0.5">
                        <Tag size={10} className="text-ink-faint" />
                        <span className="text-[10px] font-bold text-ink-soft">Disc</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={l.discountPct || ""}
                          placeholder="0"
                          onChange={(e) =>
                            setCart((c) =>
                              c.map((x) =>
                                x.productId === l.productId
                                  ? { ...x, discountPct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }
                                  : x
                              )
                            )
                          }
                          className="w-8 rounded bg-surface px-1 text-center font-mono text-[10px] font-bold text-ink border border-line/60 outline-none focus:border-accent"
                        />
                        <span className="text-[10px] font-bold text-ink-faint">%</span>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => setCart((c) => c.filter((x) => x.productId !== l.productId))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Payment Method Selector */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-bold text-ink-soft">Payment Method</span>
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {payMode === "Credit" ? "Unpaid / Credit Ledger" : "Instant Settlement"}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {PAY_MODES.map((item) => {
                  const isSel = payMode === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setPayMode(item.id)}
                      className={`flex flex-col items-center justify-center gap-1 rounded-xl p-2 text-center text-[10px] font-bold transition-all active:scale-95 ${
                        isSel
                          ? "btn-primary shadow-sm border-accent"
                          : "border border-line bg-surface hover:bg-surface-2 text-ink-soft hover:text-ink"
                      }`}
                    >
                      <item.icon size={15} strokeWidth={isSel ? 2.5 : 2} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Calculation & Grand Total Receipt Slip */}
            <div className="overflow-hidden rounded-2xl border border-line bg-surface-2/60 shadow-2xs">
              <div className="p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-ink-soft">
                  <span>Taxable Subtotal</span>
                  <span className="font-mono font-bold text-ink tabular">{formatINR2(calc.taxable)}</span>
                </div>
                {calc.discount > 0 && (
                  <div className="flex items-center justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1">
                      <Tag size={11} /> Discount Savings
                    </span>
                    <span className="font-mono tabular">− {formatINR2(calc.discount)}</span>
                  </div>
                )}
                {intra ? (
                  <>
                    <div className="flex items-center justify-between text-ink-faint">
                      <span>CGST (Output)</span>
                      <span className="font-mono tabular text-ink-soft">{formatINR2(calc.cgst)}</span>
                    </div>
                    <div className="flex items-center justify-between text-ink-faint">
                      <span>SGST (Output)</span>
                      <span className="font-mono tabular text-ink-soft">{formatINR2(calc.sgst)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between text-ink-faint">
                    <span>IGST (Output)</span>
                    <span className="font-mono tabular text-ink-soft">{formatINR2(calc.igst)}</span>
                  </div>
                )}
                {calc.roundOff !== 0 && (
                  <div className="flex items-center justify-between text-ink-faint text-[11px]">
                    <span>Round Off</span>
                    <span className="font-mono tabular">
                      {(calc.roundOff > 0 ? "+" : "−") + formatINR2(Math.abs(calc.roundOff))}
                    </span>
                  </div>
                )}
              </div>

              {/* Grand Total Highlight */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#052621] via-[#09352e] to-[#041d19] p-4 text-white">
                <div className="absolute right-0 top-0 translate-x-2 -translate-y-2 h-20 w-20 rounded-full bg-emerald-400/10 blur-xl pointer-events-none" />
                <div className="flex items-end justify-between relative z-10">
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">
                      Total Payable
                    </div>
                    <div className="text-[11px] text-white/60">Includes all GST taxes</div>
                  </div>
                  <motion.div
                    key={calc.total}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="font-display text-2xl font-black tabular tracking-tight text-white drop-shadow-sm"
                  >
                    {formatINR(calc.total)}
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              disabled={!lines.length}
              onClick={generate}
              className="btn-primary flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-extrabold shadow-lg shadow-accent/25 transition-all hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 max-xl:sticky max-xl:bottom-3"
            >
              <ReceiptText size={18} />
              <span>Create GST Invoice</span>
            </button>
          </div>
        </div>
      ) : (
        <>
        <div className="flex flex-col gap-3 sm:hidden">
          {invoices.map((inv) => (
            <div key={inv.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="break-all font-mono text-xs font-bold text-accent">{inv.no}</div>
                  <div className="mt-1 text-sm font-bold text-ink">{inv.customer.name}</div>
                  <div className="text-xs text-ink-soft">{fmtDate(inv.date)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-base font-black tabular text-ink">{formatINR(inv.total)}</div>
                  <div className="font-mono text-[11px] text-ink-faint">GST {formatINR2(inv.totalTax)}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                <Badge variant={inv.status === "paid" ? "good" : "warn"}>{inv.status === "paid" ? inv.paymentMode : "Credit · unpaid"}</Badge>
                <div className="flex gap-1.5">
                  {inv.status === "unpaid" && <Btn size="sm" variant="soft" onClick={() => { markInvoicePaid(inv.id); fire("Payment received", inv.no); }}><BadgeCheck size={13} /> Mark paid</Btn>}
                  <Btn size="sm" variant="outline" onClick={() => setViewInvoice(inv)}>View</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="card hidden overflow-x-auto p-5 scroll-thin sm:block">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint">
                <th className="pb-2 font-medium">Invoice</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Payment</th>
                <th className="pb-2 text-right font-medium">GST</th>
                <th className="pb-2 text-right font-medium">Total</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-line transition-colors hover:bg-surface-2/60">
                  <td className="py-3.5 font-mono text-xs font-bold text-accent">{inv.no}</td>
                  <td className="py-3.5 text-xs text-ink-soft">{fmtDate(inv.date)}</td>
                  <td className="py-3.5 text-xs font-bold text-ink">{inv.customer.name}</td>
                  <td className="py-3.5"><Badge variant={inv.status === "paid" ? "good" : "warn"}>{inv.status === "paid" ? inv.paymentMode : "Credit · unpaid"}</Badge></td>
                  <td className="py-3.5 text-right font-mono text-xs tabular text-ink-soft">{formatINR2(inv.totalTax)}</td>
                  <td className="py-3.5 text-right font-mono text-xs font-black tabular text-ink">{formatINR(inv.total)}</td>
                  <td className="py-3.5 pl-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {inv.status === "unpaid" && <Btn size="sm" variant="soft" onClick={() => { markInvoicePaid(inv.id); fire("Payment received", inv.no); }}><BadgeCheck size={13} /> Mark paid</Btn>}
                      <Btn size="sm" variant="outline" onClick={() => setViewInvoice(inv)}>View</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {tab === "new" && lines.length > 0 && !done && !viewInvoice && !custOpen && (
        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 xl:hidden">
          <button onClick={() => setBillOpen(true)} className="btn-primary flex w-full items-center justify-between rounded-2xl px-5 py-3.5 text-left shadow-xl">
            <span className="flex items-center gap-2.5 text-sm font-bold"><ShoppingBag size={18} /> {itemCount} {itemCount === 1 ? "item" : "items"}</span>
            <span className="flex items-center gap-3 text-sm font-extrabold"><span className="font-mono tabular">{formatINR(calc.total)}</span><span className="rounded-lg bg-white/20 px-2.5 py-1 text-xs">View bill</span></span>
          </button>
        </motion.div>
      )}

      <PrintableModal
        open={!!done || !!viewInvoice}
        onClose={() => { setDone(null); setViewInvoice(null); }}
        title={done ? "Invoice created" : "Invoice"}
        subtitle={(done || viewInvoice)?.no}
        extraActions={done && <Btn size="sm" variant="outline" onClick={() => setDone(null)}><RotateCcw size={13} /> <span className="hidden sm:inline">Next bill</span></Btn>}
      >
        {(done || viewInvoice) && <InvoiceDoc invoice={done || viewInvoice} business={business} products={products} />}
      </PrintableModal>

      <Drawer open={custOpen} onClose={() => setCustOpen(false)} title="New customer" subtitle="Add a GSTIN and the state is detected for you">
        <div className="flex flex-col gap-4">
          <Field label="Customer / firm name"><input value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} className="input" placeholder="e.g. Shree Fashions" /></Field>
          <Field label="Phone"><input value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} className="input" placeholder="98xxx xxxxx" /></Field>
          <Field label="GSTIN (optional)" error={!gstinCheck.ok ? gstinCheck.reason : ""} hint={gstinCheck.ok && gstinCheck.stateCode ? `Valid · ${stateName(gstinCheck.stateCode)}` : "For B2B customers: 15 characters"}>
            <input value={cust.gstin} onChange={(e) => setCust({ ...cust, gstin: e.target.value.toUpperCase().slice(0, 15) })} className="input font-mono" placeholder="24AAAFM2345K1ZH" />
          </Field>
          <Field label="State (place of supply)">
            <select value={gstinCheck.stateCode ?? cust.stateCode} disabled={!!gstinCheck.stateCode} onChange={(e) => setCust({ ...cust, stateCode: e.target.value })} className="input">
              {STATES.map((s) => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
            </select>
          </Field>
          <Btn size="lg" disabled={!cust.name.trim() || !gstinCheck.ok} onClick={saveCustomer}><Check size={15} /> Save customer</Btn>
        </div>
      </Drawer>
      {toast}
    </div>
  );
}

function Row({ label, value, muted }) {
  return (
    <div className={`flex items-center justify-between ${muted ? "text-ink-soft" : "text-ink"}`}>
      <span>{label}</span>
      <span className="font-mono tabular">{value}</span>
    </div>
  );
}
