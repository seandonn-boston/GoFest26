import { useMemo } from "react";
import { computeBlockPlan, computePlanSummary, type WeekendBlockPlan } from "@/domain";
import { applyResearchCredits, type ResearchCredit } from "@/domain/research";
import { RESEARCH_LINES } from "@/data/research";
import type { PlanSummary } from "@/domain/types";
import { usePlannerStore } from "@/store/usePlannerStore";

/** Recomputes the full plan summary whenever inputs, settings, or research change. */
export function usePlannerResults(): PlanSummary {
  const inputs = usePlannerStore((s) => s.inputs);
  const settings = usePlannerStore((s) => s.settings);
  const research = usePlannerStore((s) => s.research);
  const remoteAllocations = usePlannerStore((s) => s.remoteAllocations);
  return useMemo(() => {
    // Fold enabled research rewards into on-hand currency before planning.
    const credits: ResearchCredit[] = [];
    for (const line of RESEARCH_LINES) {
      if (!research[line.id]) continue;
      for (const r of line.rewards) {
        for (const id of r.bossIds ?? []) {
          credits.push({ bossId: id, currency: r.currency, amount: r.amount });
        }
      }
    }
    const credited = applyResearchCredits(Object.values(inputs), credits);
    return computePlanSummary(credited, settings, remoteAllocations);
  }, [inputs, settings, research, remoteAllocations]);
}

/**
 * The per-habitat-block plan (capacity, Mewtwo balancing, risk bands) layered on
 * top of the summary. Separate hook so it can read the priority order, which
 * lives in the store rather than in the planner settings.
 */
export function useBlockPlan(summary: PlanSummary): WeekendBlockPlan {
  const inputs = usePlannerStore((s) => s.inputs);
  const settings = usePlannerStore((s) => s.settings);
  const priorityOrder = usePlannerStore((s) => s.priorityOrder);
  const remoteAllocations = usePlannerStore((s) => s.remoteAllocations);
  return useMemo(
    () =>
      computeBlockPlan(Object.values(inputs), summary.results, summary.capacity, settings, priorityOrder, remoteAllocations),
    [inputs, summary, settings, priorityOrder, remoteAllocations],
  );
}
