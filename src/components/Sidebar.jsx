"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Package, Hammer, Receipt, BarChart3, ScanBarcode } from "lucide-react";
import { useStore } from "@/lib/store";
import { isLow, jobInfo } from "@/lib/selectors";
import { todayISO } from "@/lib/format";

export const NAV = [
  { id: "dashboard", label: "Home", short: "Home", icon: LayoutDashboard },
  { id: "billing", label: "Billing", short: "Billing", icon: Receipt },
  { id: "scan", label: "Scan Stock", short: "Scan", icon: ScanBarcode },
  { id: "products", label: "Products", short: "Products", icon: Package },
  { id: "jobwork", label: "Job Work", short: "Jobs", icon: Hammer },
  { id: "reports", label: "Reports", short: "Reports", icon: BarChart3 },
];

export function useNavBadges() {
  const products = useStore((s) => s.products);
  const jobs = useStore((s) => s.jobs);
  const [today] = useState(todayISO);
  return {
    products: products.filter(isLow).length,
    jobwork: jobs.filter((j) => jobInfo(j, today).overdue).length,
  };
}

export default function Sidebar({ active, onChange }) {
  const badges = useNavBadges();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-[#051815] via-[#07201c] to-[#031310] px-4 py-6 md:flex text-white shadow-xl z-20">
      {/* Brand Header */}
      <div className="flex items-center gap-3.5 px-2">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 font-display text-lg font-black text-[#2a1b02] shadow-lg shadow-amber-950/40 border border-amber-200/50">
          <span className="tracking-tight">N</span>
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#051815] ring-2 ring-[#051815]">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-display text-[17px] font-extrabold leading-tight tracking-tight text-white">Nexa Solutions</span>
          </div>
          <div className="text-[11px] font-medium tracking-wide text-white/50 truncate">Textile &amp; Zari Inventory</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-8 flex flex-col gap-1.5">
        {NAV.map((item) => {
          const isActive = active === item.id;
          const badge = badges[item.id];
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`group relative flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "text-white shadow-sm"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-400/30"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                >
                  <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </motion.div>
              )}
              <item.icon
                size={19}
                strokeWidth={2.2}
                className={`relative shrink-0 transition-colors duration-200 ${
                  isActive ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "text-white/50 group-hover:text-white/80"
                }`}
              />
              <span className="relative flex-1 truncate">{item.label}</span>
              {badge > 0 && (
                <span className="relative rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-400/30">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
