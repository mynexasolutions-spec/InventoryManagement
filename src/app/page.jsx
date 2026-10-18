"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import MobileNav from "@/components/MobileNav";
import { ScanProvider } from "@/components/ScanProvider";
import DashboardView from "@/components/views/DashboardView";
import ScanView from "@/components/views/ScanView";
import BillingView from "@/components/views/BillingView";
import ProductsView from "@/components/views/ProductsView";
import JobWorkView from "@/components/views/JobWorkView";
import ReportsView from "@/components/views/ReportsView";
import { useStore } from "@/lib/store";

export default function Home() {
  const [active, setActive] = useState("dashboard");
  const [ready, setReady] = useState(false);

  // Load saved data from this browser before first paint of the app (the server HTML is just a shell).
  useEffect(() => {
    Promise.resolve(useStore.persist.rehydrate()).finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#051815]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 font-display text-2xl font-black text-[#2a1b02] shadow-xl shadow-amber-950/60 ring-2 ring-amber-400/40 animate-pulse">
            N
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="font-display text-base font-extrabold tracking-tight text-white">Nexa Solutions</span>
            <span className="text-xs font-semibold text-emerald-300/80 animate-pulse">Initializing inventory &amp; billing...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScanProvider>
      <div className="flex min-h-screen bg-bg">
        <Sidebar active={active} onChange={setActive} />

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar active={active} />

          <main className="flex-1 px-5 py-6 pb-24 md:px-8 md:pb-8 max-w-7xl w-full mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              >
                {active === "dashboard" && <DashboardView onNavigate={setActive} />}
                {active === "scan" && <ScanView />}
                {active === "billing" && <BillingView />}
                {active === "products" && <ProductsView />}
                {active === "jobwork" && <JobWorkView />}
                {active === "reports" && <ReportsView />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <MobileNav active={active} onChange={setActive} />
      </div>
    </ScanProvider>
  );
}
