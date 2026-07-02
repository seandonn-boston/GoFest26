"use client";

export function CapacityGauge({ utilization }: { utilization: number }) {
  const pct = Math.min(100, Math.round(utilization * 100));
  const over = utilization > 1;
  const color = over ? "bg-rose-500" : utilization > 0.8 ? "bg-amber-400" : "bg-emerald-400";

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-400">
        <span>Weekend capacity used</span>
        <span className={over ? "text-rose-300" : "text-slate-300"}>{Math.round(utilization * 100)}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
