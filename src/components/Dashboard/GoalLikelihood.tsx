"use client";

import { useMemo, useState } from "react";
import { getBoss } from "@/data";
import { goalLikelihood } from "@/domain";
import type { WeekendBlockPlan } from "@/domain";
import { usePlannerStore, selectedInPriorityOrder } from "@/store/usePlannerStore";

const tone = (pct: number) => (pct >= 85 ? "text-emerald-300" : pct >= 50 ? "text-amber-300" : "text-rose-300");
const barColor = (pct: number) => (pct >= 85 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-rose-500");

/**
 * Odds of completing every goal given raid-drop variability — an expandable
 * score: the headline is the chance of hitting ALL goals, the body lists each
 * species' own chance in priority order. Sits at the bottom of the bars section.
 */
export function GoalLikelihood({ plan }: { plan: WeekendBlockPlan }) {
  const [open, setOpen] = useState(false);
  const inputs = usePlannerStore((s) => s.inputs);
  const priorityOrder = usePlannerStore((s) => s.priorityOrder);

  const odds = useMemo(() => goalLikelihood(plan), [plan]);
  const order = useMemo(
    () => selectedInPriorityOrder({ inputs, priorityOrder }).filter((id) => odds.bySpecies[id] !== undefined),
    [inputs, priorityOrder, odds],
  );
  if (!order.length) return null;

  const pct = Math.round(odds.overall * 100);

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-gofest-bg/30">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full px-2.5 py-2 text-left">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-slate-300">
            <span className={`mr-1 inline-block text-slate-500 transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
            You&apos;re <span className={`font-bold ${tone(pct)}`}>{pct}%</span> likely to achieve all your goals
          </span>
          <span className="shrink-0 text-[10px] text-slate-500">per-Pokémon ⌄</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-inset ring-white/10">
          <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${pct}%` }} />
        </div>
      </button>

      {open ? (
        <ul className="space-y-1 border-t border-white/10 px-2.5 py-2 text-xs">
          {order.map((id) => {
            const boss = getBoss(id);
            const p = Math.round((odds.bySpecies[id] ?? 0) * 100);
            return (
              <li key={id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-slate-300">{boss?.name ?? id}</span>
                <span className={`shrink-0 font-mono font-bold ${tone(p)}`}>{p}%</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
