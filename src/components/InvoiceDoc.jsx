"use client";

import BarcodeSVG from "./BarcodeSVG";
import ProductPhoto from "./ProductPhoto";
import { amountInWords, stateName } from "@/lib/gst";
import { formatINR2, fmtDate } from "@/lib/format";

// Paper-style document: fixed colours on purpose so screen preview and print look identical in any theme.
export default function InvoiceDoc({ invoice, business, products }) {
  const byId = (id) => products.find((p) => p.id === id);
  const taxCols = invoice.intra ? ["CGST", "SGST"] : ["IGST"];
  const money = (n) => formatINR2(n).replace("₹", "");

  return (
    <div className="print-doc mx-auto w-full min-w-176 max-w-198.5 bg-white p-8 text-[12px] leading-snug text-neutral-900">
      <div className="flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-4">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">{business.name}</div>
          <div className="mt-1 max-w-[320px] text-neutral-600">{business.address}</div>
          <div className="mt-1 text-neutral-600">Ph: {business.phone}</div>
          <div className="mt-1 font-semibold">GSTIN: <span className="font-mono">{business.gstin}</span></div>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold uppercase tracking-widest text-neutral-800">Tax Invoice</div>
          <div className="mt-1 font-mono text-[13px] font-bold">{invoice.no}</div>
          <div className="text-neutral-600">Date: {fmtDate(invoice.date)}</div>
          <div className="text-neutral-600">Payment: {invoice.paymentMode}</div>
          <div className="mt-2 flex justify-end">
            <BarcodeSVG value={invoice.no} format="CODE128" height={30} barWidth={1.4} fontSize={10} maxWidth={170} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 border-b border-neutral-300 py-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Bill to</div>
          <div className="mt-0.5 text-[13px] font-bold">{invoice.customer.name}</div>
          {invoice.customer.phone && <div className="text-neutral-600">Ph: {invoice.customer.phone}</div>}
          {invoice.customer.gstin ? (
            <div className="font-semibold">GSTIN: <span className="font-mono">{invoice.customer.gstin}</span></div>
          ) : (
            <div className="text-neutral-500">Unregistered (B2C)</div>
          )}
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Place of supply</div>
          <div className="mt-0.5 text-[13px] font-bold">
            {stateName(invoice.customer.stateCode || business.stateCode)} ({invoice.customer.stateCode || business.stateCode})
          </div>
          <div className="text-neutral-600">{invoice.intra ? "Intra-state supply · CGST + SGST" : "Inter-state supply · IGST"}</div>
        </div>
      </div>

      <table className="mt-3 w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-neutral-900 text-white">
            <th className="px-1.5 py-1.5 text-left">#</th>
            <th className="px-1.5 py-1.5 text-left">Item</th>
            <th className="px-1.5 py-1.5 text-left">HSN</th>
            <th className="px-1.5 py-1.5 text-right">Qty</th>
            <th className="px-1.5 py-1.5 text-right">Rate</th>
            <th className="px-1.5 py-1.5 text-right">Disc</th>
            <th className="px-1.5 py-1.5 text-right">Taxable</th>
            {taxCols.map((c) => (
              <th key={c} className="px-1.5 py-1.5 text-right">{c}</th>
            ))}
            <th className="px-1.5 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it, i) => {
            const p = byId(it.productId);
            return (
              <tr key={i} className="print-avoid border-b border-neutral-200 align-middle">
                <td className="px-1.5 py-1.5 text-neutral-500">{i + 1}</td>
                <td className="px-1.5 py-1.5">
                  <div className="flex items-center gap-2">
                    {p && <ProductPhoto product={p} size={34} rounded="rounded" />}
                    <div>
                      <div className="font-semibold">{it.name}</div>
                      <div className="font-mono text-[10px] text-neutral-500">{it.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="px-1.5 py-1.5 font-mono">{it.hsn}</td>
                <td className="px-1.5 py-1.5 text-right">{it.qty} {it.unit}</td>
                <td className="px-1.5 py-1.5 text-right">{money(it.rate)}</td>
                <td className="px-1.5 py-1.5 text-right">{it.discountPct ? `${it.discountPct}%` : "—"}</td>
                <td className="px-1.5 py-1.5 text-right">{money(it.taxable)}</td>
                {invoice.intra ? (
                  <>
                    <td className="px-1.5 py-1.5 text-right">{money(it.cgst)}<div className="text-[9px] text-neutral-500">{it.gst / 2}%</div></td>
                    <td className="px-1.5 py-1.5 text-right">{money(it.sgst)}<div className="text-[9px] text-neutral-500">{it.gst / 2}%</div></td>
                  </>
                ) : (
                  <td className="px-1.5 py-1.5 text-right">{money(it.igst)}<div className="text-[9px] text-neutral-500">{it.gst}%</div></td>
                )}
                <td className="px-1.5 py-1.5 text-right font-semibold">{money(it.lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="print-avoid mt-3 grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Amount in words</div>
          <div className="mt-0.5 font-semibold">{amountInWords(invoice.total)}</div>

          <table className="mt-3 w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-neutral-100 text-neutral-600">
                <th className="px-1.5 py-1 text-left">HSN</th>
                <th className="px-1.5 py-1 text-right">Taxable</th>
                <th className="px-1.5 py-1 text-right">Rate</th>
                {taxCols.map((c) => (
                  <th key={c} className="px-1.5 py-1 text-right">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.hsnSummary.map((h) => (
                <tr key={h.hsn + h.gst} className="border-b border-neutral-200">
                  <td className="px-1.5 py-1 font-mono">{h.hsn}</td>
                  <td className="px-1.5 py-1 text-right">{money(h.taxable)}</td>
                  <td className="px-1.5 py-1 text-right">{h.gst}%</td>
                  {invoice.intra ? (
                    <>
                      <td className="px-1.5 py-1 text-right">{money(h.cgst)}</td>
                      <td className="px-1.5 py-1 text-right">{money(h.sgst)}</td>
                    </>
                  ) : (
                    <td className="px-1.5 py-1 text-right">{money(h.igst)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="col-span-2 space-y-1">
          <Row label="Taxable value" value={money(invoice.taxable)} />
          {invoice.discount > 0 && <Row label="Discount given" value={money(invoice.discount)} muted />}
          {invoice.intra ? (
            <>
              <Row label="CGST" value={money(invoice.cgst)} />
              <Row label="SGST" value={money(invoice.sgst)} />
            </>
          ) : (
            <Row label="IGST" value={money(invoice.igst)} />
          )}
          <Row label="Round off" value={(invoice.roundOff >= 0 ? "+" : "-") + money(Math.abs(invoice.roundOff))} muted />
          <div className="mt-1 flex items-center justify-between rounded bg-neutral-900 px-2.5 py-2 text-white">
            <span className="text-[11px] font-bold uppercase tracking-wider">Grand total</span>
            <span className="text-[15px] font-extrabold">₹{money(invoice.total)}</span>
          </div>
        </div>
      </div>

      <div className="print-avoid mt-8 grid grid-cols-2 gap-6 border-t border-neutral-300 pt-3 text-[10px] text-neutral-600">
        <div>
          <div className="font-bold uppercase tracking-wider text-neutral-500">Terms</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            <li>Goods once sold will not be taken back or exchanged without bill.</li>
            <li>Subject to Surat jurisdiction. E. &amp; O.E.</li>
            <li>UPI: {business.upi}</li>
          </ul>
        </div>
        <div className="text-right">
          <div className="font-semibold text-neutral-800">For {business.name}</div>
          <div className="mt-8 border-t border-neutral-400 pt-1">Authorised signatory</div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted }) {
  return (
    <div className={`flex items-center justify-between ${muted ? "text-neutral-500" : ""}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
