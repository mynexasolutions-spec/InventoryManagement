"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PackagePlus, PackageMinus, ClipboardCheck, Minus, Plus, Undo2, ScanBarcode, TriangleAlert, CheckCheck, Check, ChevronDown } from "lucide-react";
import ProductPhoto from "@/components/ProductPhoto";
import Badge from "@/components/Badge";
import ScanBar from "@/components/ScanBar";
import { useScanHandler, beep } from "@/components/ScanProvider";
import { Btn, EmptyState } from "@/components/ui";
import { useStore } from "@/lib/store";
import { findProductByCode, normalizeCode } from "@/lib/barcode";
import { isLow } from "@/lib/selectors";
import { fmtTime } from "@/lib/format";
import { useToast } from "@/lib/useToast";

const MODES = [
  { id: "in", label: "Add stock", help: "Goods arrived. Every scan adds to stock.", icon: PackagePlus, color: "#2a9d62" },
  { id: "out", label: "Remove stock", help: "Damaged, lost or given as sample. Every scan removes stock.", icon: PackageMinus, color: "#d1534a" },
  { id: "audit", label: "Count stock", help: "Physical check: scan every piece on the shelf, then match the software stock to your count.", icon: ClipboardCheck, color: "#4f8df0" },
];
const OUT_REASONS = ["Damaged", "Lost / theft", "Sample given", "Returned to supplier"];

export default function ScanView() {
  const products = useStore((s) => s.products);
  const adjustStock = useStore((s) => s.adjustStock);
  const applyStockCounts = useStore((s) => s.applyStockCounts);
  const { fire, node: toast } = useToast();

  const [mode, setMode] = useState("in");
  const [tapOpen, setTapOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState(OUT_REASONS[0]);
  const [last, setLast] = useState(null);
  const [log, setLog] = useState([]);
  const [counts, setCounts] = useState({});

  function handleScan(code) {
    const live = useStore.getState().products;
    const p = findProductByCode(live, code);
    const ts = new Date().toISOString();
    if (!p) {
      beep(false, `Barcode not found: ${normalizeCode(code)}`);
      setLast({ unknown: normalizeCode(code), ts });
      return;
    }
    if (mode === "in" || mode === "out") {
      const delta = mode === "in" ? qty : -qty;
      if (p.stock + delta < 0) {
        beep(false, `Not enough stock: ${p.name}`);
        fire("Not enough stock", `${p.name} has only ${p.stock} ${p.unit}`);
        return;
      }
      beep(true, `${mode === "in" ? "Added" : "Removed"}: ${p.name}`);
      adjustStock({ productId: p.id, delta, type: mode === "in" ? "stock-in" : "stock-out", reason: mode === "in" ? "Stock added (scan)" : `Stock removed: ${reason}` });
      const entry = { id: ts + p.id, productId: p.id, delta, before: p.stock, after: p.stock + delta, ts, undone: false };
      setLast({ ...entry });
      setLog((l) => [entry, ...l].slice(0, 40));
    } else {
      beep(true, `Counted: ${p.name}`);
      setCounts((c) => ({ ...c, [p.id]: (c[p.id] || 0) + qty }));
      setLast({ productId: p.id, audit: true, ts });
    }
  }
  useScanHandler(handleScan);

  function undo(entry) {
    adjustStock({ productId: entry.productId, delta: -entry.delta, type: "adjust", reason: "Scan undone" });
    setLog((l) => l.map((x) => (x.id === entry.id ? { ...x, undone: true } : x)));
    setLast(null);
    fire("Undone", "Stock is back to what it was");
  }

  const lastProduct = last?.productId ? products.find((p) => p.id === last.productId) : null;
  const auditRows = useMemo(() => Object.entries(counts).map(([id, counted]) => ({ p: products.find((x) => x.id === id), counted })).filter((r) => r.p), [counts, products]);
  const auditDiffs = auditRows.filter((r) => r.counted !== r.p.stock).length;
  const m = MODES.find((x) => x.id === mode);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <div className="flex flex-col gap-5 xl:col-span-2">
        {/* mode switch */}
        <div className="card p-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            {MODES.map((x) => (
              <button key={x.id} onClick={() => { setMode(x.id); setLast(null); }} className="relative flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-[13px] font-bold transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:py-3 sm:text-sm">
                {mode === x.id && <motion.span layoutId="mode-pill" className="absolute inset-0 rounded-xl" style={{ background: `${x.color}1f`, boxShadow: `inset 0 0 0 1.5px ${x.color}` }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <x.icon size={17} className="relative" style={{ color: mode === x.id ? x.color : undefined }} />
                <span className={`relative ${mode === x.id ? "text-ink" : "text-ink-soft"}`}>{x.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-5">
            {/* scanner zone */}
            <div className="hero-panel flex flex-col gap-4 p-5 md:col-span-2 md:gap-5 md:p-6" style={{ "--hero-radius": "0px" }}>
              <div className="relative z-10">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">{m.label}</div>
                <p className="mt-1 text-sm text-white/80">{m.help}</p>
              </div>

              <div className="relative z-10 mx-auto flex h-28 w-28 items-center justify-center md:h-36 md:w-36">
                {[["left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-2xl"], ["right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-2xl"], ["left-0 bottom-0 border-l-[3px] border-b-[3px] rounded-bl-2xl"], ["right-0 bottom-0 border-r-[3px] border-b-[3px] rounded-br-2xl"]].map(([c]) => (
                  <span key={c} className={`absolute h-8 w-8 border-[#f6dfa0] ${c}`} />
                ))}
                <ScanBarcode size={56} strokeWidth={1.4} className="text-white/85" />
                <span className="scan-line absolute left-3 right-3 h-0.5 rounded-full bg-[#f6dfa0] shadow-[0_0_14px_3px_rgba(246,223,160,0.8)]" />
              </div>

              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
                  <span className="text-xs font-semibold text-white/80">{mode === "audit" ? "Count per scan" : "Pieces per scan"}</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25" aria-label="Less"><Minus size={13} /></button>
                    <input type="number" min="1" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="h-7 w-12 rounded-lg bg-white/15 text-center font-mono text-sm font-bold text-white outline-none" />
                    <button onClick={() => setQty((q) => q + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white hover:bg-white/25" aria-label="More"><Plus size={13} /></button>
                  </div>
                </div>
                {mode === "out" && (
                  <select value={reason} onChange={(e) => setReason(e.target.value)} className="input">
                    {OUT_REASONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                )}
              </div>
            </div>

            {/* result zone */}
            <div className="flex flex-col gap-4 p-6 md:col-span-3">
              <ScanBar onScan={handleScan} autoFocus placeholder="Scan or type barcode" cameraTitle={`${m.label}: scan with camera`} cameraHint="Camera stays open, scan one item after another" />

              <AnimatePresence mode="wait">
                {last?.unknown ? (
                  <motion.div key="unk" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 items-center gap-4 rounded-2xl border border-bad/30 bg-bad-light px-5 py-6 text-bad">
                    <TriangleAlert size={30} />
                    <div>
                      <div className="text-base font-extrabold">Barcode not found</div>
                      <div className="mt-0.5 font-mono text-xs">{last.unknown} is not linked to any product</div>
                    </div>
                  </motion.div>
                ) : lastProduct ? (
                  <motion.div key={last.ts} initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative">
                      <ProductPhoto product={lastProduct} size={150} rounded="rounded-2xl" />
                      {!last.audit && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.1 }} className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-good text-white shadow-lg">
                          <Check size={18} strokeWidth={3} />
                        </motion.span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate font-display text-lg font-extrabold text-ink">{lastProduct.name}</div>
                        {isLow(lastProduct) && <Badge variant="warn">Low stock</Badge>}
                      </div>
                      <div className="font-mono text-xs text-accent">{lastProduct.sku} · {lastProduct.barcode}</div>

                      {last.audit ? (
                        <div className="mt-4 flex items-center gap-3 text-sm">
                          <span className="text-ink-soft">Software <b className="font-mono text-ink">{lastProduct.stock}</b></span>
                          <span className="text-ink-faint">·</span>
                          <span className="text-ink-soft">You counted <b className="font-mono text-info">{counts[lastProduct.id]}</b></span>
                        </div>
                      ) : (
                        <>
                          <div className="mt-4 flex items-center gap-3">
                            <span className="rounded-md bg-surface-2 px-2 py-1 text-xs font-semibold text-ink-faint">was {last.before}</span>
                            <motion.span key={last.after} initial={{ scale: 1.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 14 }} className={`font-mono text-5xl font-extrabold tabular ${last.delta > 0 ? "text-good" : "text-bad"}`}>{last.after}</motion.span>
                            <Badge variant={last.delta > 0 ? "good" : "bad"}>{last.delta > 0 ? "+" : ""}{last.delta} {lastProduct.unit}</Badge>
                          </div>
                          <button onClick={() => undo(last)} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink-soft hover:border-ink-faint hover:text-ink"><Undo2 size={13} /> Undo this scan</button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-12 text-center">
                    <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}><ScanBarcode size={38} strokeWidth={1.5} className="text-accent" /></motion.div>
                    <div className="text-base font-bold text-ink">Ready to scan</div>
                    <div className="text-xs text-ink-soft">The scanned product will appear here</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {mode === "audit" && (
          <div className="card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-extrabold text-ink">Shelf count check</h3>
                <p className="text-xs text-ink-soft">Your physical count against what the software shows</p>
              </div>
              <div className="flex gap-2">
                <Btn size="sm" variant="outline" onClick={() => setCounts({})}>Reset</Btn>
                <Btn size="sm" disabled={!auditDiffs} onClick={() => { applyStockCounts(counts); setCounts({}); setLast(null); fire("Stock corrected", `${auditDiffs} items adjusted`); }}>
                  <CheckCheck size={14} /> Set stock to my count{auditDiffs ? ` (${auditDiffs})` : ""}
                </Btn>
              </div>
            </div>
            {auditRows.length === 0 ? (
              <div className="rounded-xl bg-surface-2 p-4 text-sm text-ink-soft">
                <div className="font-bold text-ink">How a shelf count works</div>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed">
                  <li>Take one product. Scan each piece you physically have (one scan = one piece).</li>
                  <li>The list below shows what you counted next to what the software has.</li>
                  <li>If they differ, tap <b className="text-ink">Set stock to my count</b>. Stock is corrected and the change is saved in the stock history.</li>
                </ol>
                <p className="mt-2 text-xs">Example: software says 9, you counted 7 on the shelf. After the update, stock becomes 7.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {auditRows.map(({ p, counted }) => {
                  const diff = counted - p.stock;
                  return (
                    <div key={p.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
                      <ProductPhoto product={p} size={40} rounded="rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-ink">{p.name}</div>
                        <div className="mt-0.5 font-mono text-[11px] tabular text-ink-soft">Software {p.stock} · You counted <b className="text-ink">{counted}</b></div>
                      </div>
                      <Badge variant={diff === 0 ? "good" : "bad"} className="shrink-0">{diff === 0 ? "Matches" : diff < 0 ? `${-diff} less` : `${diff} more`}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="card p-5">
          <button type="button" onClick={() => setTapOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left md:pointer-events-none">
            <span>
              <span className="block font-display text-sm font-extrabold text-ink">No scanner with you? Tap a product</span>
              <span className="block text-xs text-ink-soft">Each tap works exactly like scanning its barcode</span>
            </span>
            <ChevronDown size={18} className={`shrink-0 text-ink-faint transition-transform md:hidden ${tapOpen ? "rotate-180" : ""}`} />
          </button>
          <div className={`${tapOpen ? "flex" : "hidden"} scroll-thin mt-3 gap-3 overflow-x-auto pb-1 md:flex`}>
            {products.map((p) => (
              <button key={p.id} onClick={() => handleScan(p.barcode, "tap")} className="group flex w-36 shrink-0 flex-col gap-2 rounded-2xl border border-line bg-surface p-2 text-left transition-all hover:-translate-y-1 hover:border-accent/60 hover:shadow-lg">
                <ProductPhoto product={p} size={128} rounded="rounded-xl" className="h-20! w-full!" />
                <div className="truncate text-xs font-bold text-ink">{p.name}</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-accent">{p.sku}</span>
                  <span className="rounded bg-surface-2 px-1.5 font-mono text-[10px] font-bold text-ink-soft">{p.stock}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card flex flex-col p-5 xl:self-start">
        <button type="button" onClick={() => setLogOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left md:pointer-events-none">
          <span>
            <span className="block font-display text-sm font-extrabold text-ink">This session{log.length > 0 && <span className="ml-2 rounded-full bg-accent-light px-2 py-0.5 font-mono text-[11px] text-accent-dark">{log.length}</span>}</span>
            <span className="block text-xs text-ink-soft">Everything you scanned just now</span>
          </span>
          <ChevronDown size={18} className={`shrink-0 text-ink-faint transition-transform md:hidden ${logOpen ? "rotate-180" : ""}`} />
        </button>
        <div className={`${logOpen ? "block" : "hidden"} mt-3 md:block`}>
        {log.length === 0 ? (
          <EmptyState icon={ScanBarcode} title="No scans yet" />
        ) : (
          <div className="scroll-thin flex max-h-[560px] flex-col gap-1.5 overflow-y-auto">
            <AnimatePresence initial={false}>
              {log.map((e) => {
                const p = products.find((x) => x.id === e.productId);
                if (!p) return null;
                return (
                  <motion.div key={e.id} layout initial={{ opacity: 0, x: 16 }} animate={{ opacity: e.undone ? 0.45 : 1, x: 0 }} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-2.5 py-2">
                    <ProductPhoto product={p} size={36} rounded="rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <div className={`truncate text-xs font-bold text-ink ${e.undone ? "line-through" : ""}`}>{p.name}</div>
                      <div className="text-[10px] text-ink-faint">{fmtTime(e.ts)} · {e.before} to {e.after}</div>
                    </div>
                    <span className={`font-mono text-xs font-extrabold ${e.delta > 0 ? "text-good" : "text-bad"}`}>{e.delta > 0 ? "+" : ""}{e.delta}</span>
                    {!e.undone && (
                      <button onClick={() => undo(e)} className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faint hover:bg-surface hover:text-ink" aria-label="Undo"><Undo2 size={13} /></button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
        </div>
      </div>
      {toast}
    </div>
  );
}
