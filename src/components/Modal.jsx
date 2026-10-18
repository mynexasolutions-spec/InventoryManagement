"use client";

import { useBodyLock } from "@/lib/useBodyLock";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, subtitle, children, width = "max-w-2xl", actions }) {
  useBodyLock(open);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={`relative flex h-dvh w-full ${width} flex-col overflow-hidden bg-surface pt-[env(safe-area-inset-top)] shadow-pop sm:h-auto sm:max-h-[92vh] sm:rounded-2xl sm:pt-0`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:gap-4 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-ink sm:text-lg">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {actions}
                <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-2 hover:text-ink" aria-label="Close">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="scroll-thin flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
