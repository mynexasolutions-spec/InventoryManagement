"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useCountUp } from "@/lib/useCountUp";

export default function StatCard({
  icon: Icon,
  label,
  value,
  format,
  delta,
  deltaTone = "good",
  tone = "#0d9488",
  index = 0,
  spark,
  footer,
}) {
  const animated = useCountUp(value);
  const display = format ? format(animated) : Math.round(animated).toLocaleString("en-IN");
  const gid = useId().replace(/:/g, "");
  const data = spark?.map((v, i) => ({ i, v }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 + index * 0.06, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="card card-lift relative flex flex-col p-5 overflow-hidden group"
    >
      {/* Subtle top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-80 transition-opacity group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, ${tone}, transparent)` }}
      />

      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-bold text-ink-soft tracking-wide">{label}</span>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-105"
          style={{ background: `${tone}18`, color: tone, border: `1px solid ${tone}25` }}
        >
          <Icon size={19} strokeWidth={2.3} />
        </div>
      </div>

      <div className="mt-3.5 font-display text-[30px] font-black leading-none tracking-tight tabular text-ink">
        {display}
      </div>

      {delta && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
              deltaTone === "good"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
            }`}
          >
            {delta}
          </span>
        </div>
      )}

      {data && (
        <div className="-mx-1 mt-3 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tone} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={tone} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={tone}
                strokeWidth={2}
                fill={`url(#${gid})`}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {footer && <div className="mt-4 border-t border-line/60 pt-3">{footer}</div>}
    </motion.div>
  );
}
