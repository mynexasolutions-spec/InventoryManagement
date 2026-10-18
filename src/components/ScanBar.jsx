"use client";

import { useState } from "react";
import { Camera, ScanLine } from "lucide-react";
import { useScanner } from "./ScanProvider";

export default function ScanBar({
  onScan,
  placeholder = "Scan with a barcode gun, or type SKU / Barcode and press Enter",
  autoFocus = false,
  cameraTitle = "Scan barcode",
  cameraHint,
}) {
  const [value, setValue] = useState("");
  const { openCamera } = useScanner();

  function submit(e) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    onScan(v, "manual");
    setValue("");
  }

  return (
    <form onSubmit={submit} className="flex gap-2 sm:gap-2.5">
      <div className="relative flex-1 group">
        <ScanLine
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 hidden -translate-y-1/2 text-accent transition-transform group-focus-within:scale-110 min-[360px]:block"
        />
        <input
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          inputMode="text"
          autoComplete="off"
          className={`input scan-input py-2.5! pl-3! text-[12px]! font-mono shadow-xs min-[360px]:pl-10! min-[360px]:text-[13px]! sm:text-sm! ${value ? "pr-16!" : "pr-3! sm:pr-14!"}`}
        />
        {value ? (
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-accent-solid px-2 py-1.5 text-[11px] font-bold text-white shadow-xs"
          >
            Scan
          </button>
        ) : (
          <span className="hidden sm:inline-flex pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 text-[10px] font-mono font-semibold text-ink-faint">
            Enter
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => openCamera({ title: cameraTitle, hint: cameraHint })}
        className="btn-primary inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold shadow-md sm:px-4 shadow-accent/20 transition-all active:scale-[0.98]"
      >
        <Camera size={16} />
        <span className="hidden sm:inline">Camera Scan</span>
      </button>
    </form>
  );
}
