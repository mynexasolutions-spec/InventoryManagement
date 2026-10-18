"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CircleAlert } from "lucide-react";

const ERROR = /not found|not linked|out of stock|not enough|no open job|could not|cannot|failed/i;

export default function Toast({ show, message, sub }) {
  const isError = ERROR.test(message);
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:w-auto">
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className={`card flex items-center gap-3 px-4 py-3 shadow-pop ${isError ? "border-bad/40" : ""}`}
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isError ? "bg-bad-light text-bad" : "bg-good-light text-good"}`}>
              {isError ? <CircleAlert size={16} strokeWidth={2.5} /> : <CheckCircle2 size={16} strokeWidth={2.5} />}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">{message}</div>
              {sub && <div className="text-xs text-ink-soft">{sub}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
