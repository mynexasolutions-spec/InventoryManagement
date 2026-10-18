"use client";

import BarcodeSVG from "./BarcodeSVG";
import { formatINR } from "@/lib/format";

export function mrpOf(p) {
  return Math.round(p.price * (1 + p.gst / 100));
}

// Sheet of retail price tags: dark brand strip, product, big MRP and a full-width real EAN-13 barcode.
const COLS = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" };

export default function LabelSheet({ items, businessName, cols = 3, showPrice = true }) {
  const labels = items.flatMap(({ product, copies }) => Array.from({ length: copies }, () => product));

  return (
    <div className="print-doc mx-auto w-full max-w-198.5 bg-white p-3 text-neutral-900 sm:p-6">
      <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${COLS[cols] ?? COLS[3]}`}>
        {labels.map((p, i) => (
          <div key={i} className="print-avoid overflow-hidden rounded-xl border border-neutral-300 bg-white shadow-sm print:shadow-none">
            <div className="flex items-center justify-between gap-2 bg-[#0b3a34] px-3 py-1.5 text-white">
              <span className="truncate text-[9px] font-extrabold uppercase tracking-[0.16em]">{businessName}</span>
              <span className="shrink-0 font-mono text-[9px] font-bold text-[#f6dfa0]">{p.sku}</span>
            </div>

            <div className="px-3 pb-2 pt-2.5">
              <div className="text-[12px] font-bold leading-tight text-neutral-900">{p.name}</div>

              {showPrice && (
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-neutral-400">MRP incl. GST</div>
                    <div className="text-[24px] font-black leading-none tracking-tight text-neutral-950">{formatINR(mrpOf(p))}</div>
                  </div>
                  <span className="mb-0.5 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[9px] font-bold text-neutral-600">{p.gst}% GST</span>
                </div>
              )}

              <BarcodeSVG value={p.barcode} height={44} barWidth={2} fontSize={11} maxWidth={9999} className="-mx-1 mt-2" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 text-center text-[11px] font-medium text-neutral-400 print:hidden">
        {labels.length} {labels.length === 1 ? "label" : "labels"} ready to print
      </div>
    </div>
  );
}
