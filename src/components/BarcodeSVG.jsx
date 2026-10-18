"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import JsBarcode from "jsbarcode";

// Real, scannable barcode. Always near-black bars on a white label with proper quiet zones
// (EAN-13 needs >= 11 modules on the left and >= 7 on the right) so cameras and scanners can read it in any layout.
export default function BarcodeSVG({
  value,
  format = "EAN13",
  height = 60,
  barWidth = 3,
  fontSize = 16,
  displayValue = true,
  maxWidth = 280,
  caption = false,
  className = "",
}) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const opts = {
      height,
      width: barWidth,
      fontSize,
      displayValue,
      background: "#ffffff",
      lineColor: "#0a0a0a",
      font: "ui-monospace, Menlo, Consolas, monospace",
      fontOptions: "bold",
      textMargin: 4,
      marginTop: 10,
      marginBottom: 8,
      marginLeft: barWidth * 14,
      marginRight: barWidth * 10,
    };
    try {
      JsBarcode(svg, value, { ...opts, format });
    } catch {
      try {
        JsBarcode(svg, value, { ...opts, format: "CODE128" });
      } catch {
        return;
      }
    }
    const w = parseFloat(svg.getAttribute("width"));
    const h = parseFloat(svg.getAttribute("height"));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("shape-rendering", "crispEdges");
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";
  }, [value, format, height, barWidth, fontSize, displayValue]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  }

  return (
    <div className={`overflow-hidden rounded-xl bg-white text-neutral-900 ${caption ? "shadow-sm ring-1 ring-black/10" : ""} ${className}`} style={{ maxWidth }}>
      {caption && (
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-neutral-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {format === "EAN13" ? "EAN-13 · Retail barcode" : "Code 128"}
          </span>
          <button type="button" onClick={copy} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-800" aria-label="Copy barcode number">
            {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <svg ref={ref} role="img" aria-label={`Barcode ${value}`} />
    </div>
  );
}
