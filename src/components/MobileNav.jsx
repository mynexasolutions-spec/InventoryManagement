"use client";

import { motion } from "framer-motion";
import { NAV, useNavBadges } from "./Sidebar";

// Six equal-width slots that never wrap, with safe-area padding for phones with a home bar.
export default function MobileNav({ active, onChange }) {
  const badges = useNavBadges();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_-12px_rgba(0,0,0,0.25)] md:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-6">
        {NAV.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 pb-2 pt-2.5 transition-colors ${isActive ? "text-accent" : "text-ink-faint active:text-ink-soft"}`}
            >
              {isActive && <motion.span layoutId="mobile-nav-bar" className="absolute inset-x-3 top-0 h-[3px] rounded-b-full bg-accent-solid" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative">
                <item.icon size={21} strokeWidth={isActive ? 2.5 : 2} />
                {badges[item.id] > 0 && <span className="absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-amber-500" />}
              </span>
              <span className="w-full whitespace-nowrap pb-0.5 text-center text-[10px] font-bold leading-[1.3]">{item.short}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
