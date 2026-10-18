"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, PackageCheck, FileText, Wallet, ScrollText, UserPlus, Clock, TriangleAlert, Camera, Check, Hammer, CalendarClock } from "lucide-react";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Drawer from "@/components/Drawer";
import ScanBar from "@/components/ScanBar";
import ProductPhoto from "@/components/ProductPhoto";
import PrintableModal from "@/components/PrintableModal";
import ChallanDoc from "@/components/ChallanDoc";
import { useScanHandler, useScanner, beep } from "@/components/ScanProvider";
import { Btn, Field, EmptyState } from "@/components/ui";
import { useStore } from "@/lib/store";
import { findProductByCode, normalizeCode } from "@/lib/barcode";
import { jobInfo, workerStatement, workerTotals } from "@/lib/selectors";
import { addDays, todayISO, formatINR, formatINR2, fmtDate } from "@/lib/format";
import { useToast } from "@/lib/useToast";

const DAMAGE_REASONS = ["Dye bleed", "Thread / stitching damaged", "Fabric cut", "Stain", "Zari damaged", "Other"];
const PAY_MODES = ["Cash", "UPI", "Bank Transfer"];

export default function JobWorkView() {
  const jobs = useStore((s) => s.jobs);
  const workers = useStore((s) => s.workers);
  const products = useStore((s) => s.products);
  const ledger = useStore((s) => s.ledger);
  const business = useStore((s) => s.business);
  const issueJob = useStore((s) => s.issueJob);
  const receiveJob = useStore((s) => s.receiveJob);
  const addPayment = useStore((s) => s.addPayment);
  const addWorker = useStore((s) => s.addWorker);
  const { fire, node: toast } = useToast();
  const { openCamera } = useScanner();

  const [today] = useState(todayISO);
  const [tab, setTab] = useState("jobs");
  const [filter, setFilter] = useState("open");

  const [issueOpen, setIssueOpen] = useState(false);
  const [issue, setIssue] = useState({ workerId: "", productId: "", qty: "", rate: "", dueDate: addDays(todayISO(), 7), note: "" });
  const [issueErr, setIssueErr] = useState("");
  const [challanJobId, setChallanJobId] = useState(null);

  const [recvJobId, setRecvJobId] = useState(null);
  const [recv, setRecv] = useState({ good: "", damaged: "", reason: DAMAGE_REASONS[0], deduction: "", payNow: false, mode: "Cash" });
  const [recvErr, setRecvErr] = useState("");

  const [payWorker, setPayWorker] = useState(null);
  const [pay, setPay] = useState({ amount: "", mode: "Cash", note: "" });
  const [stmtWorker, setStmtWorker] = useState(null);

  const [workerOpen, setWorkerOpen] = useState(false);
  const [nw, setNw] = useState({ name: "", specialty: "", phone: "", rate: "" });

  const enriched = useMemo(
    () => jobs.map((j) => ({ ...j, product: products.find((p) => p.id === j.productId), worker: workers.find((w) => w.id === j.workerId), info: jobInfo(j, today) })).filter((j) => j.product && j.worker),
    [jobs, products, workers, today]
  );
  const shown = enriched.filter((j) => (filter === "all" ? true : filter === "open" ? j.info.open : filter === "overdue" ? j.info.overdue : !j.info.open));
  const counts = { open: enriched.filter((j) => j.info.open).length, overdue: enriched.filter((j) => j.info.overdue).length, done: enriched.filter((j) => !j.info.open).length };
  const recvJob = enriched.find((j) => j.id === recvJobId) ?? null;
  const challanJob = enriched.find((j) => j.id === challanJobId) ?? null;

  function openReceive(job) {
    setRecvJobId(job.id);
    setRecv({ good: String(job.qtyIssued - job.qtyGood - job.qtyDamaged), damaged: "", reason: DAMAGE_REASONS[0], deduction: "", payNow: false, mode: "Cash" });
    setRecvErr("");
  }

  function onScan(code) {
    const p = findProductByCode(useStore.getState().products, code);
    if (!p) {
      beep(false, `Barcode not found: ${normalizeCode(code)}`);
      fire("Barcode not found", normalizeCode(code));
      return;
    }
    if (issueOpen) {
      beep(true, `Selected: ${p.name}`);
      setIssue((f) => ({ ...f, productId: p.id }));
      return;
    }
    const open = useStore.getState().jobs.filter((j) => j.productId === p.id && j.status !== "completed").sort((a, b) => (a.dateIssued < b.dateIssued ? -1 : 1));
    if (!open.length) {
      beep(false, `No open job for ${p.name}`);
      fire("No open job", `${p.name} is not with any karigar right now`);
      return;
    }
    beep(true, `Receiving: ${p.name}`);
    setTab("jobs");
    openReceive(open[0]);
  }
  useScanHandler(recvJob || payWorker || workerOpen ? null : onScan);

  function submitIssue(e) {
    e.preventDefault();
    const res = issueJob({ workerId: issue.workerId, productId: issue.productId, qty: Number(issue.qty), rate: Number(issue.rate), dueDate: issue.dueDate, note: issue.note });
    if (!res.ok) return setIssueErr(res.error);
    beep(true);
    setIssueOpen(false);
    setChallanJobId(res.job.id);
    fire("Job work issued", `${res.job.challanNo} · ${res.job.qtyIssued} pcs taken out of stock`);
  }

  const recvGood = Number(recv.good) || 0;
  const recvDamaged = Number(recv.damaged) || 0;
  const suggestedDeduction = recvJob ? Math.round(recvDamaged * recvJob.product.cost) : 0;
  const recvDeduction = recv.deduction === "" ? suggestedDeduction : Number(recv.deduction) || 0;
  const recvWage = recvJob ? recvGood * recvJob.rate : 0;
  const recvNet = recvWage - recvDeduction;

  function submitReceive(e) {
    e.preventDefault();
    const res = receiveJob({ jobId: recvJob.id, good: recvGood, damaged: recvDamaged, damageNote: recvDamaged ? recv.reason : "", deduction: recvDeduction });
    if (!res.ok) return setRecvErr(res.error);
    if (recv.payNow && recvNet > 0) addPayment({ workerId: recvJob.workerId, jobId: recvJob.id, amount: recvNet, mode: recv.mode, note: `${recvJob.challanNo} settlement` });
    beep(true);
    fire("Goods received", `${recvGood} pcs back in stock${recvDamaged ? ` · ${recvDamaged} damaged recorded` : ""}`);
    setRecvJobId(null);
  }

  function submitPay(e) {
    e.preventDefault();
    const res = addPayment({ workerId: payWorker.id, amount: Number(pay.amount), mode: pay.mode, note: pay.note || "Payment" });
    if (!res.ok) return;
    beep(true);
    fire("Payment recorded", `${payWorker.name} · ${formatINR(Number(pay.amount))}`);
    setPayWorker(null);
  }

  function submitWorker(e) {
    e.preventDefault();
    if (!nw.name.trim()) return;
    const w = addWorker({ name: nw.name.trim(), specialty: nw.specialty, phone: nw.phone, rate: Number(nw.rate) || 0 });
    setWorkerOpen(false);
    setNw({ name: "", specialty: "", phone: "", rate: "" });
    fire("Karigar added", w.name);
  }

  const issueProduct = products.find((p) => p.id === issue.productId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="card flex w-full gap-1 p-1.5 sm:w-auto">
          {[["jobs", "Jobs", Hammer], ["workers", "Karigars & ledger", Wallet]].map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} className="relative flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-bold sm:flex-none sm:px-4 sm:py-2">
              {tab === id && <motion.span layoutId="jw-tab" className="absolute inset-0 rounded-xl bg-accent-solid shadow-md" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <Icon size={15} className={`relative ${tab === id ? "text-white" : "text-ink-faint"}`} />
              <span className={`relative ${tab === id ? "text-white" : "text-ink-soft"}`}>{label}</span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Btn variant="outline" className="whitespace-nowrap px-3!" onClick={() => setWorkerOpen(true)}><UserPlus size={15} /> Add karigar</Btn>
          <Btn className="whitespace-nowrap px-3!" onClick={() => { setIssue({ workerId: "", productId: "", qty: "", rate: "", dueDate: addDays(todayISO(), 7), note: "" }); setIssueErr(""); setIssueOpen(true); }}>
            <Plus size={16} strokeWidth={2.5} /> Issue job work
          </Btn>
        </div>
      </div>

      {tab === "jobs" ? (
        <>
          <ScanBar onScan={onScan} placeholder="Scan a returned item to receive it from the karigar" cameraTitle="Scan returned item" />
          <div className="flex flex-wrap gap-2">
            {[["open", `Open (${counts.open})`], ["overdue", `Overdue (${counts.overdue})`], ["done", `Completed (${counts.done})`], ["all", "All"]].map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)} className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${filter === id ? "border-accent-solid bg-accent-solid text-white" : "border-line bg-surface text-ink-soft hover:text-ink"}`}>{label}</button>
            ))}
          </div>

          {shown.length === 0 ? (
            <EmptyState icon={Hammer} title="No jobs here" text="Try another filter, or issue new job work." />
          ) : (
            <motion.div layout className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AnimatePresence initial={false}>
                {shown.map((j) => {
                  const pctGood = (j.qtyGood / j.qtyIssued) * 100;
                  const pctBad = (j.qtyDamaged / j.qtyIssued) * 100;
                  return (
                    <motion.div key={j.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} whileHover={{ y: -3 }} className="card flex flex-col gap-4 p-5">
                      <div className="flex items-start gap-4">
                        <ProductPhoto product={j.product} size={72} rounded="rounded-2xl" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-accent">{j.challanNo}</span>
                            {j.status === "completed" ? <Badge variant="good">Completed</Badge> : j.info.overdue ? <Badge variant="bad"><TriangleAlert size={11} /> {j.info.lateBy} days late</Badge> : <Badge variant="warn" dot>{j.status === "partial" ? "Partly returned" : "With karigar"}</Badge>}
                          </div>
                          <div className="mt-1 truncate font-display text-[15px] font-bold text-ink">{j.product.name}</div>
                          <div className="text-xs text-ink-soft">{j.note || j.worker.specialty}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-surface-2 px-3.5 py-2.5">
                        <Avatar name={j.worker.name} tone={j.worker.tone} size={34} radius="rounded-full" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-ink">{j.worker.name}</div>
                          <div className="text-[11px] text-ink-faint">{j.worker.specialty} · ₹{j.rate} per piece</div>
                        </div>
                        <div className="text-right text-[11px] text-ink-faint">
                          <div className="flex items-center justify-end gap-1"><Clock size={11} /> Given {fmtDate(j.dateIssued)}</div>
                          <div className={`flex items-center justify-end gap-1 ${j.info.overdue ? "font-bold text-bad" : ""}`}><CalendarClock size={11} /> Due {fmtDate(j.dueDate)}</div>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="font-bold text-ink">{j.qtyIssued} pcs given</span>
                          <span className="font-mono tabular text-ink-faint">
                            <b className="text-good">{j.qtyGood} good</b>{j.qtyDamaged > 0 && <> · <b className="text-bad">{j.qtyDamaged} damaged</b></>}{j.info.remaining > 0 && <> · {j.info.remaining} pending</>}
                          </span>
                        </div>
                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-line">
                          <motion.div className="h-full bg-good" initial={{ width: 0 }} animate={{ width: `${pctGood}%` }} transition={{ duration: 0.7 }} />
                          <motion.div className="h-full bg-bad" initial={{ width: 0 }} animate={{ width: `${pctBad}%` }} transition={{ duration: 0.7 }} />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {j.info.open && <Btn size="sm" onClick={() => openReceive(j)}><PackageCheck size={14} /> Receive goods</Btn>}
                        <Btn size="sm" variant="outline" onClick={() => setChallanJobId(j.id)}><FileText size={14} /> Challan</Btn>
                        <span className="ml-auto font-mono text-xs font-bold tabular text-ink-soft">Wage so far {formatINR(j.qtyGood * j.rate)}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {workers.map((w, i) => {
            const t = workerTotals(ledger, w.id);
            const wj = enriched.filter((j) => j.workerId === w.id);
            const damaged = wj.reduce((s, j) => s + j.qtyDamaged, 0);
            const done = wj.reduce((s, j) => s + j.qtyGood, 0);
            return (
              <motion.div key={w.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card flex flex-col gap-4 p-5">
                <div className="flex items-center gap-4">
                  <Avatar name={w.name} tone={w.tone} size={52} radius="rounded-2xl" />
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-base font-bold text-ink">{w.name}</div>
                    <div className="text-xs text-ink-soft">{w.specialty} · {w.phone} · ₹{w.rate}/pc</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">You owe</div>
                    <div className={`font-mono text-2xl font-extrabold tabular ${t.balance > 0 ? "text-amber" : "text-good"}`}>{formatINR(t.balance)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[["Done", `${done} pcs`], ["Damaged", `${damaged} pcs`], ["Wages", formatINR(t.wages)], ["Paid", formatINR(t.paid)]].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-surface-2 px-1 py-2.5">
                      <div className="text-[10px] font-semibold text-ink-faint">{k}</div>
                      <div className="font-mono text-xs font-extrabold tabular text-ink">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Btn size="sm" onClick={() => { setPayWorker(w); setPay({ amount: t.balance > 0 ? String(t.balance) : "", mode: "Cash", note: "" }); }}><Wallet size={14} /> Pay karigar</Btn>
                  <Btn size="sm" variant="outline" onClick={() => setStmtWorker(w)}><ScrollText size={14} /> Ledger</Btn>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ---- issue ---- */}
      <Drawer open={issueOpen} onClose={() => setIssueOpen(false)} title="Issue job work" subtitle="Give goods to a karigar. Stock reduces and a challan is created.">
        <form onSubmit={submitIssue} className="flex flex-col gap-4">
          <Field label="Karigar">
            <select value={issue.workerId} onChange={(e) => { const w = workers.find((x) => x.id === e.target.value); setIssue({ ...issue, workerId: e.target.value, rate: w ? String(w.rate) : issue.rate }); }} className="input">
              <option value="">Select karigar…</option>
              {workers.map((w) => <option key={w.id} value={w.id}>{w.name} — {w.specialty}</option>)}
            </select>
          </Field>
          <Field label="Product" hint="You can also scan the product barcode">
            <div className="flex gap-2">
              <select value={issue.productId} onChange={(e) => setIssue({ ...issue, productId: e.target.value })} className="input">
                <option value="">Select product…</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.stock} {p.unit})</option>)}
              </select>
              <Btn type="button" variant="soft" onClick={() => openCamera({ title: "Scan the product" })}><Camera size={15} /></Btn>
            </div>
          </Field>
          {issueProduct && (
            <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
              <ProductPhoto product={issueProduct} size={56} rounded="rounded-xl" />
              <div className="text-xs">
                <div className="text-sm font-bold text-ink">{issueProduct.name}</div>
                <div className="font-mono text-ink-faint">{issueProduct.sku} · {issueProduct.stock} {issueProduct.unit} in stock</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity"><input type="number" min="1" value={issue.qty} onChange={(e) => setIssue({ ...issue, qty: e.target.value })} className="input" /></Field>
            <Field label="Rate per piece (₹)"><input type="number" min="0" value={issue.rate} onChange={(e) => setIssue({ ...issue, rate: e.target.value })} className="input" /></Field>
          </div>
          <Field label="Return by"><input type="date" value={issue.dueDate} onChange={(e) => setIssue({ ...issue, dueDate: e.target.value })} className="input" /></Field>
          <Field label="Work details"><input value={issue.note} onChange={(e) => setIssue({ ...issue, note: e.target.value })} placeholder="e.g. Zari butti work, border stitching" className="input" /></Field>
          {Number(issue.qty) > 0 && Number(issue.rate) > 0 && (
            <div className="rounded-xl bg-accent-light px-3.5 py-2.5 text-xs font-semibold text-accent-dark">Estimated wage: <b className="font-mono">{formatINR(Number(issue.qty) * Number(issue.rate))}</b></div>
          )}
          {issueErr && <div className="rounded-lg bg-bad-light px-3 py-2 text-xs font-semibold text-bad">{issueErr}</div>}
          <Btn type="submit" size="lg">Issue and create challan</Btn>
        </form>
      </Drawer>

      {/* ---- receive ---- */}
      <Drawer open={!!recvJob} onClose={() => setRecvJobId(null)} title="Receive goods" subtitle={recvJob ? `${recvJob.challanNo} · ${recvJob.worker.name}` : ""}>
        {recvJob && (
          <form onSubmit={submitReceive} className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
              <ProductPhoto product={recvJob.product} size={60} rounded="rounded-xl" />
              <div className="text-xs">
                <div className="text-sm font-bold text-ink">{recvJob.product.name}</div>
                <div className="text-ink-faint">{recvJob.qtyIssued} given · {recvJob.qtyGood + recvJob.qtyDamaged} returned · <b className="text-ink">{recvJob.info.remaining} pending</b></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Good pieces"><input type="number" min="0" max={recvJob.info.remaining} value={recv.good} onChange={(e) => setRecv({ ...recv, good: e.target.value })} className="input" /></Field>
              <Field label="Damaged pieces"><input type="number" min="0" max={recvJob.info.remaining} value={recv.damaged} onChange={(e) => setRecv({ ...recv, damaged: e.target.value })} className="input" /></Field>
            </div>
            {recvDamaged > 0 && (
              <div className="flex flex-col gap-3 rounded-xl border border-bad/30 bg-bad-light p-3">
                <Field label="What went wrong?">
                  <select value={recv.reason} onChange={(e) => setRecv({ ...recv, reason: e.target.value })} className="input">{DAMAGE_REASONS.map((r) => <option key={r}>{r}</option>)}</select>
                </Field>
                <Field label="Deduct from karigar's wage (₹)" hint={`Suggested: ${recvDamaged} × cost ₹${recvJob.product.cost} = ${formatINR(suggestedDeduction)}`}>
                  <input type="number" min="0" value={recv.deduction} placeholder={String(suggestedDeduction)} onChange={(e) => setRecv({ ...recv, deduction: e.target.value })} className="input" />
                </Field>
              </div>
            )}
            <div className="space-y-1.5 rounded-xl border border-line p-3.5 text-sm">
              <SumRow label={`Wage (${recvGood} × ₹${recvJob.rate})`} value={formatINR2(recvWage)} />
              {recvDeduction > 0 && <SumRow label="Damage deduction" value={"− " + formatINR2(recvDeduction)} tone="text-bad" />}
              <div className="flex items-center justify-between border-t border-line pt-2 text-base font-extrabold text-ink"><span>Added to ledger</span><span className="font-mono">{formatINR2(recvNet)}</span></div>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-surface-2 px-3.5 py-3 text-xs font-semibold text-ink-soft">
              <input type="checkbox" checked={recv.payNow} onChange={(e) => setRecv({ ...recv, payNow: e.target.checked })} className="h-4 w-4 accent-accent-solid" />
              Pay now ({formatINR(Math.max(0, recvNet))})
              {recv.payNow && <select value={recv.mode} onChange={(e) => setRecv({ ...recv, mode: e.target.value })} className="input ml-auto! w-auto! py-1!">{PAY_MODES.map((m) => <option key={m}>{m}</option>)}</select>}
            </label>
            <div className="rounded-xl bg-accent-light px-3.5 py-2.5 text-[11px] font-semibold text-accent-dark">{recvGood} pcs will go back into stock{recvDamaged ? `, ${recvDamaged} pcs into the damage register` : ""}.</div>
            {recvErr && <div className="rounded-lg bg-bad-light px-3 py-2 text-xs font-semibold text-bad">{recvErr}</div>}
            <Btn type="submit" size="lg"><Check size={15} /> Confirm receive</Btn>
          </form>
        )}
      </Drawer>

      {/* ---- payment ---- */}
      <Drawer open={!!payWorker} onClose={() => setPayWorker(null)} title="Pay karigar" subtitle={payWorker?.name}>
        {payWorker && (
          <form onSubmit={submitPay} className="flex flex-col gap-4">
            <div className="rounded-xl bg-surface-2 p-3.5 text-xs text-ink-soft">You owe: <b className="font-mono text-lg text-amber">{formatINR(workerTotals(ledger, payWorker.id).balance)}</b></div>
            <Field label="Amount (₹)"><input type="number" min="1" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} className="input" /></Field>
            <Field label="Mode">
              <div className="flex gap-2">{PAY_MODES.map((m) => <button key={m} type="button" onClick={() => setPay({ ...pay, mode: m })} className={`flex-1 rounded-xl border px-2 py-2.5 text-xs font-bold ${pay.mode === m ? "border-accent-solid bg-accent-solid text-white" : "border-line text-ink-soft"}`}>{m}</button>)}</div>
            </Field>
            <Field label="Note"><input value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} placeholder="e.g. Advance, challan JW-0003" className="input" /></Field>
            <Btn type="submit" size="lg" disabled={!(Number(pay.amount) > 0)}>Save payment</Btn>
          </form>
        )}
      </Drawer>

      <Drawer open={workerOpen} onClose={() => setWorkerOpen(false)} title="New karigar" subtitle="Add a worker">
        <form onSubmit={submitWorker} className="flex flex-col gap-4">
          <Field label="Name"><input value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} className="input" /></Field>
          <Field label="Skill"><input value={nw.specialty} onChange={(e) => setNw({ ...nw, specialty: e.target.value })} placeholder="Embroidery, Dyeing, Stitching…" className="input" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone"><input value={nw.phone} onChange={(e) => setNw({ ...nw, phone: e.target.value })} className="input" /></Field>
            <Field label="Default rate / pc (₹)"><input type="number" min="0" value={nw.rate} onChange={(e) => setNw({ ...nw, rate: e.target.value })} className="input" /></Field>
          </div>
          <Btn type="submit" size="lg" disabled={!nw.name.trim()}>Save karigar</Btn>
        </form>
      </Drawer>

      <PrintableModal open={!!challanJob} onClose={() => setChallanJobId(null)} title="Delivery challan" subtitle={challanJob?.challanNo}>
        {challanJob && <ChallanDoc job={challanJob} product={challanJob.product} worker={challanJob.worker} business={business} />}
      </PrintableModal>

      <PrintableModal open={!!stmtWorker} onClose={() => setStmtWorker(null)} title="Karigar ledger" subtitle={stmtWorker?.name} width="max-w-3xl">
        {stmtWorker && <Statement worker={stmtWorker} ledger={ledger} business={business} />}
      </PrintableModal>
      {toast}
    </div>
  );
}

function SumRow({ label, value, tone = "text-ink-soft" }) {
  return (
    <div className={`flex items-center justify-between ${tone}`}>
      <span>{label}</span>
      <span className="font-mono tabular">{value}</span>
    </div>
  );
}

function Statement({ worker, ledger, business }) {
  const rows = workerStatement(ledger, worker.id);
  const t = workerTotals(ledger, worker.id);
  const money = (n) => formatINR2(n).replace("₹", "");
  return (
    <div className="print-doc mx-auto w-full min-w-176 max-w-198.5 bg-white p-8 text-[12px] text-neutral-900">
      <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-3">
        <div>
          <div className="text-xl font-extrabold">{business.name}</div>
          <div className="text-neutral-600">Karigar ledger statement</div>
        </div>
        <div className="text-right">
          <div className="text-base font-bold">{worker.name}</div>
          <div className="text-neutral-600">{worker.specialty} · {worker.phone}</div>
        </div>
      </div>
      <table className="mt-3 w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-neutral-900 text-white">
            <th className="px-2 py-1.5 text-left">Date</th>
            <th className="px-2 py-1.5 text-left">Details</th>
            <th className="px-2 py-1.5 text-right">Wage earned</th>
            <th className="px-2 py-1.5 text-right">Paid / deducted</th>
            <th className="px-2 py-1.5 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="print-avoid border-b border-neutral-200">
              <td className="px-2 py-1.5 whitespace-nowrap">{fmtDate(r.date)}</td>
              <td className="px-2 py-1.5">
                <span className="font-semibold">{r.type === "wage" ? "Wage" : r.type === "deduction" ? "Damage deduction" : `Payment${r.mode ? " · " + r.mode : ""}`}</span>
                <div className="text-[10px] text-neutral-500">{r.note}</div>
              </td>
              <td className="px-2 py-1.5 text-right">{r.type === "wage" ? money(r.amount) : ""}</td>
              <td className="px-2 py-1.5 text-right">{r.type !== "wage" ? money(r.amount) : ""}</td>
              <td className="px-2 py-1.5 text-right font-semibold">{money(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 ml-auto w-64 space-y-1">
        <div className="flex justify-between"><span>Total wages</span><span className="font-mono">{money(t.wages)}</span></div>
        <div className="flex justify-between"><span>Damage deductions</span><span className="font-mono">− {money(t.deductions)}</span></div>
        <div className="flex justify-between"><span>Paid</span><span className="font-mono">− {money(t.paid)}</span></div>
        <div className="flex justify-between rounded bg-neutral-900 px-2 py-1.5 font-bold text-white"><span>Balance payable</span><span className="font-mono">₹{money(t.balance)}</span></div>
      </div>
    </div>
  );
}
