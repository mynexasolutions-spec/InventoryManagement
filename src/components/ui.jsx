"use client";

export function Field({ label, hint, error, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-semibold text-ink-soft tracking-wide">{label}</span>
      {children}
      {error ? (
        <span className="text-[11px] font-semibold text-rose-500">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-ink-faint">{hint}</span>
      ) : null}
    </label>
  );
}

const btn = {
  primary: "btn-primary",
  soft: "bg-accent-light text-accent-dark hover:bg-accent-solid hover:text-white shadow-xs border border-accent/20",
  outline: "border border-line bg-surface text-ink-soft hover:text-ink hover:border-ink-faint hover:bg-surface-2 shadow-xs",
  danger: "bg-bad-light text-bad hover:bg-bad hover:text-white border border-bad/20 shadow-xs",
  gold: "bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-bold hover:brightness-105 shadow-sm border border-amber-300",
};

export function Btn({ variant = "primary", size = "md", className = "", children, ...props }) {
  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-xl",
    lg: "px-5 py-3 text-sm rounded-xl",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 font-bold transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${btn[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-ink-faint">
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-ink-faint border border-line shadow-xs">
          <Icon size={28} strokeWidth={1.7} />
        </div>
      )}
      <div>
        <div className="text-sm font-bold text-ink">{title}</div>
        {text && <p className="mt-1 max-w-xs text-xs text-ink-soft leading-relaxed">{text}</p>}
      </div>
    </div>
  );
}

export function SectionCard({ title, subtitle, action, children, className = "" }) {
  return (
    <div className={`card p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-5 flex items-start justify-between gap-3 border-b border-line/60 pb-3.5">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-accent to-emerald-400" />
            <div>
              <h3 className="font-display text-base font-extrabold text-ink tracking-tight">{title}</h3>
              {subtitle && <p className="text-xs text-ink-soft mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
