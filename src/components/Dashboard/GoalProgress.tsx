"use client";

import { useMemo } from "react";
import { PlusToggle } from "@/components/ui/PlusToggle";
import { useExpandable } from "@/hooks/useExpandable";
import { getBoss } from "@/data";
import { goalProgress } from "@/domain";
import type { WeekendBlockPlan } from "@/domain";
import type { BossResult } from "@/domain/types";
import { usePlannerStore } from "@/store/usePlannerStore";

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
  const [open, setOpen] = useExpandable(false);
  const inputs = usePlannerStore((s) => s.inputs);
  const settings = usePlannerStore((s) => s.settings);
  const quickCatchBlocks = usePlannerStore((s) => s.quickCatchBlocks);
  const setSelected = usePlannerStore((s) => s.setSelected);

  const progress = useMemo(
    () => goalProgress(plan, results, settings, quickCatchBlocks, headStart),
    [plan, results, settings, quickCatchBlocks, headStart],
  );
  // Order by outcome, not priority: fully-covered goals first (fewest raids →
  // most), then partials (least raids remaining → most), then targets the plan
  // couldn't allocate any raids to. Ties break by name.
  const order = useMemo(() => {
    const group = (a: number, r: number) => (a <= 0 ? 2 : a >= r ? 0 : 1); // 0 done · 1 partial · 2 none
    return Object.keys(progress.bySpecies)
      .filter((id) => inputs[id]?.selected)
      .sort((x, y) => {
        const px = progress.bySpecies[x]!;
        const py = progress.bySpecies[y]!;
        const gx = group(px.achievable, px.required);
        const gy = group(py.achievable, py.required);
        if (gx !== gy) return gx - gy;
        // within complete/none: by required asc; within partial: by remaining asc.
        const kx = gx === 1 ? px.required - px.achievable : px.required;
        const ky = gy === 1 ? py.required - py.achievable : py.required;
        return kx - ky || (getBoss(x)?.name ?? x).localeCompare(getBoss(y)?.name ?? y);
      });
  }, [inputs, progress]);
  if (!order.length || progress.required === 0) return null;

  const { achievable, required } = progress;
  const pct = Math.min(100, Math.round((achievable / required) * 100));

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-gofest-bg/30">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full px-2.5 py-2 text-left">
        <div className="flex items-baseline justify-between gap-2">
          <span className="inline-flex items-center text-xs text-slate-300">
            Raids you can do toward your goals:{" "}
            <span className={`font-mono font-bold ${ratioTone(achievable, required)}`}>
              {achievable}/{required}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-slate-500">
            per-Pokémon
            <PlusToggle open={open} size={11} className="text-slate-400" />
          </span>
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
                <span className="flex shrink-0 items-center gap-2.5">
                  <span className={`font-mono font-bold ${ratioTone(a, r)}`}>
                    {a}/{r}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelected(id, false)}
                    aria-label={`Remove ${boss?.name ?? id} from your plan`}
                    title="Remove from your plan — deselects it on step 1 and everywhere else"
                    className="flex h-5 w-5 items-center justify-center rounded text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-300"
                  >
                    ✕
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
