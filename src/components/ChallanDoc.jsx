"use client";

import BarcodeSVG from "./BarcodeSVG";
import ProductPhoto from "./ProductPhoto";
import { fmtDate, formatINR2 } from "@/lib/format";

// Job-work delivery challan (goods sent to a karigar, to be returned after processing).
export default function ChallanDoc({ job, product, worker, business }) {
  const value = product.cost * job.qtyIssued;
  return (
    <div className="print-doc mx-auto w-full min-w-176 max-w-198.5 bg-white p-8 text-[12px] leading-snug text-neutral-900">
      <div className="flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-4">
        <div>
          <div className="text-2xl font-extrabold tracking-tight">{business.name}</div>
          <div className="mt-1 max-w-[320px] text-neutral-600">{business.address}</div>
          <div className="mt-1 font-semibold">GSTIN: <span className="font-mono">{business.gstin}</span></div>
        </div>
        <div className="text-right">
          <div className="text-lg font-extrabold uppercase tracking-widest">Delivery Challan</div>
          <div className="text-[11px] text-neutral-600">Goods sent for job work</div>
          <div className="mt-1 font-mono text-[13px] font-bold">{job.challanNo}</div>
          <div className="text-neutral-600">Date: {fmtDate(job.dateIssued)}</div>
          <div className="mt-2 flex justify-end">
            <BarcodeSVG value={job.challanNo} format="CODE128" height={30} barWidth={1.6} fontSize={10} maxWidth={150} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 border-b border-neutral-300 py-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Issued to (karigar)</div>
          <div className="mt-0.5 text-[13px] font-bold">{worker.name}</div>
          <div className="text-neutral-600">{worker.specialty}</div>
          <div className="text-neutral-600">Ph: {worker.phone}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Return by</div>
          <div className="mt-0.5 text-[13px] font-bold">{fmtDate(job.dueDate)}</div>
          <div className="text-neutral-600">Rate agreed: ₹{job.rate} per piece</div>
        </div>
      </div>

      <table className="mt-3 w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-neutral-900 text-white">
            <th className="px-2 py-1.5 text-left">Item</th>
            <th className="px-2 py-1.5 text-left">HSN</th>
            <th className="px-2 py-1.5 text-right">Qty</th>
            <th className="px-2 py-1.5 text-right">Approx. value</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-neutral-200">
            <td className="px-2 py-2">
              <div className="flex items-center gap-2">
                <ProductPhoto product={product} size={40} rounded="rounded" />
                <div>
                  <div className="font-semibold">{product.name}</div>
                  <div className="font-mono text-[10px] text-neutral-500">{product.sku}</div>
                </div>
              </div>
            </td>
            <td className="px-2 py-2 font-mono">{product.hsn}</td>
            <td className="px-2 py-2 text-right">{job.qtyIssued} {product.unit}</td>
            <td className="px-2 py-2 text-right">₹{formatINR2(value).replace("₹", "")}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 text-neutral-600">
        Work: <b className="text-neutral-900">{job.note || worker.specialty}</b>. Goods are sent for job work only and not for sale; to be returned after processing.
      </div>

      <div className="mt-14 grid grid-cols-2 gap-10 text-[11px] text-neutral-600">
        <div className="border-t border-neutral-400 pt-1">Receiver&apos;s signature ({worker.name})</div>
        <div className="border-t border-neutral-400 pt-1 text-right">For {business.name}</div>
      </div>
    </div>
  );
}
