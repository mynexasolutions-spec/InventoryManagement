"use client";

import { useBodyLock } from "@/lib/useBodyLock";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export default function Drawer({ open, onClose, title, subtitle, children }) {
  useBodyLock(open);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px]"
          />
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-surface shadow-pop"
          >
            <div className="flex items-start justify-between border-b border-line px-6 py-5">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-2 hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
            <div className="scroll-thin flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
