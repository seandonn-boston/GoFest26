"use client";

/**
 * "Add another" control: how many of a species to take to the goal. N copies
 * cost N× the resources (candy, XL, energy), so this materially changes the
 * raid plan. Clamped at 1+.
 */
export function QuantityStepper({
  value,
  onChange,
  label = "Max out",
}: {
  value: number;
  onChange: (n: number) => void;
  label?: string;
}) {
  const n = Math.max(1, Math.round(value || 1));
  const btn =
    "flex h-7 w-7 items-center justify-center rounded-sm border border-white/15 bg-gofest-bg/50 font-mono text-sm font-bold text-slate-200 disabled:opacity-30 active:translate-y-px";
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-gofest-bg/40 px-2.5 py-2">
      <span className="text-[11px] uppercase tracking-wide text-slate-400">
        {label} <span className="text-slate-200">{n}</span> {n === 1 ? "copy" : "copies"}
      </span>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label="One fewer" className={btn} disabled={n <= 1} onClick={() => onChange(n - 1)}>
          −
        </button>
        <span className="w-5 text-center font-mono text-sm font-bold text-gofest-accent2">{n}</span>
        <button type="button" aria-label="One more" className={btn} onClick={() => onChange(n + 1)}>
          +
        </button>
      </div>
    </div>
  );
}
