"use client";

import { useEffect, useState } from "react";
import { ScanLine, RotateCcw, ChevronDown, Sun, Moon, Sparkles, Building2 } from "lucide-react";
import Avatar from "./Avatar";
import { useScanner } from "./ScanProvider";
import { useStore } from "@/lib/store";

const titles = {
  dashboard: ["Home", "Your textile business today, at a glance"],
  billing: ["Billing & POS", "Scan products, instant GST invoices and receipts"],
  scan: ["Scan Stock", "Instant barcode scan — stock updates automatically"],
  products: ["Products Catalog", "Photos, barcodes, HSN codes, and inventory levels"],
  jobwork: ["Job Work Management", "Assign to karigars, monitor deadlines, damage & wages"],
  reports: ["Reports & Analytics", "GST filing summaries, sales trends, stock audit & karigars"],
};

export default function Topbar({ active }) {
  const [title, sub] = titles[active] ?? titles.dashboard;
  const { openCamera } = useScanner();
  const resetAll = useStore((s) => s.resetAll);
  const business = useStore((s) => s.business);
  const [menu, setMenu] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      return saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  function toggleTheme() {
    if (document.documentElement.classList.contains("dark")) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  }

  return (
    <header className="glass sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-3.5 md:px-8">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="whitespace-nowrap font-display text-[17px] font-black leading-tight tracking-tight text-ink sm:text-[22px]">{title}</h1>
        </div>
        <p className="hidden truncate text-xs font-medium text-ink-soft sm:block">{sub}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        {/* Dark/Light toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft transition-all hover:bg-surface-2 hover:text-ink active:scale-95 shadow-sm sm:h-10 sm:w-10"
        >
          {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-slate-600" />}
        </button>

        {/* Quick Scan Button */}
        <button
          onClick={() => openCamera({ title: "Quick Barcode Scanner", hint: "Position barcode in the frame" })}
          className="btn-primary inline-flex h-9 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold shadow-md shadow-emerald-900/10 active:scale-[0.97] sm:h-10 sm:px-4"
        >
          <ScanLine size={17} className="animate-pulse" />
          <span className="hidden sm:inline">Scan Barcode</span>
        </button>

        {/* User / Business Profile */}
        <div className="relative">
          <button
            onClick={() => { setMenu((m) => !m); setConfirm(false); }}
            className="flex items-center gap-2.5 rounded-xl border border-line bg-surface p-1 transition-all hover:bg-surface-2 active:scale-[0.98] shadow-sm sm:p-1.5 sm:pr-3"
          >
            <Avatar name="Nexa Solutions" tone={["#d97706", "#92400e"]} size={30} radius="rounded-lg" />
            <div className="hidden text-left leading-tight sm:block">
              <div className="text-xs font-extrabold text-ink">Nexa Solutions</div>
              <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Owner • GST Active</div>
            </div>
            <ChevronDown size={14} className="hidden text-ink-faint sm:block" />
          </button>

          {menu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
              <div className="card absolute right-0 top-12 z-40 w-72 p-3 shadow-pop border border-line">
                <div className="mb-2.5 border-b border-line pb-2.5 px-1">
                  <div className="font-display text-sm font-bold text-ink">{business?.name || "Nexa Solutions"}</div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-ink-soft">
                    <Building2 size={12} className="text-ink-faint" />
                    <span>Surat, Gujarat • GST: {business?.gstin || "24ABCDE1234F1Z5"}</span>
                  </div>
                </div>

                {!confirm ? (
                  <button
                    onClick={() => setConfirm(true)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-bad hover:bg-bad-light transition-colors"
                  >
                    <RotateCcw size={14} /> Reset sample data
                  </button>
                ) : (
                  <div className="rounded-xl bg-bad-light p-3">
                    <p className="text-xs font-semibold text-bad leading-relaxed">
                      Reset all invoices, products, and jobs back to initial sample state?
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => { resetAll(); setMenu(false); setConfirm(false); }}
                        className="flex-1 rounded-lg bg-bad px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-95"
                      >
                        Yes, reset
                      </button>
                      <button
                        onClick={() => setConfirm(false)}
                        className="flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-surface-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
