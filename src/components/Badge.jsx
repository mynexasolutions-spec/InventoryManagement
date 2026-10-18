const variants = {
  good: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
  warn: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30",
  bad: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30",
  info: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30",
  accent: "bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/30",
  neutral: "bg-surface-2 text-ink-soft border border-line",
};

export default function Badge({ children, variant = "neutral", dot = false, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-tight shadow-2xs ${variants[variant]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
