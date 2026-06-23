"use client";

import { useMemo, useState } from "react";
import { PlusToggle } from "@/components/ui/PlusToggle";
import { getBoss } from "@/data";
import { goalProgress } from "@/domain";
import type { WeekendBlockPlan } from "@/domain";
import type { BossResult } from "@/domain/types";
import { usePlannerStore, selectedInGlobalOrder } from "@/store/usePlannerStore";

const ratioTone = (a: number, r: number) => {
  const x = r > 0 ? a / r : 1;
  return x >= 0.999 ? "text-emerald-300" : x >= 0.6 ? "text-amber-300" : "text-rose-300";
};
const ratioBar = (a: number, r: number) => {
  const x = r > 0 ? a / r : 1;
  return x >= 0.999 ? "bg-emerald-400" : x >= 0.6 ? "bg-amber-400" : "bg-rose-500";
};

/**
 * How much of every goal the plan covers — achievable raids over required raids,
 * a fraction (not a probability) so partial progress always shows. Headline is
 * the weekend total; expands to the per-species n/k in priority order. Includes
 * remote raids. Sits at the bottom of the bars section.
 */
export function GoalProgress({
  plan,
  results,
  headStart = {},
}: {
  plan: WeekendBlockPlan;
  results: BossResult[];
  headStart?: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const inputs = usePlannerStore((s) => s.inputs);
  const blockPriority = usePlannerStore((s) => s.blockPriority);
  const settings = usePlannerStore((s) => s.settings);
  const quickCatchBlocks = usePlannerStore((s) => s.quickCatchBlocks);

  const progress = useMemo(
    () => goalProgress(plan, results, settings, quickCatchBlocks, headStart),
    [plan, results, settings, quickCatchBlocks, headStart],
  );
  const order = useMemo(
    () => selectedInGlobalOrder({ inputs, blockPriority }).filter((id) => progress.bySpecies[id] !== undefined),
    [inputs, blockPriority, progress],
  );
  if (!order.length || progress.required === 0) return null;

  const { achievable, required } = progress;
  const pct = Math.min(100, Math.round((achievable / required) * 100));

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-gofest-bg/30">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full px-2.5 py-2 text-left">
        <div className="flex items-baseline justify-between gap-2">
          <span className="inline-flex items-center text-xs text-slate-300">
            <PlusToggle open={open} size={11} className="mr-1.5 shrink-0 text-slate-400" />
            Raids you can do toward your goals:{" "}
            <span className={`font-mono font-bold ${ratioTone(achievable, required)}`}>
              {achievable}/{required}
            </span>
          </span>
          <span className="shrink-0 text-[10px] text-slate-500">per-Pokémon ⌄</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-inset ring-white/10">
          <div className={`h-full rounded-full ${ratioBar(achievable, required)}`} style={{ width: `${pct}%` }} />
        </div>
      </button>

      {open ? (
        <ul className="space-y-1 border-t border-white/10 px-2.5 py-2 text-xs">
          {order.map((id) => {
            const boss = getBoss(id);
            const { achievable: a, required: r } = progress.bySpecies[id]!;
            return (
              <li key={id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-slate-300">{boss?.name ?? id}</span>
                <span className={`shrink-0 font-mono font-bold ${ratioTone(a, r)}`}>
                  {a}/{r}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
