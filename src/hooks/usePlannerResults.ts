import { useMemo } from "react";
import { computePlanSummary } from "@/domain";
import { applyResearchCredits, type ResearchCredit } from "@/domain/research";
import { RESEARCH_LINES } from "@/data/research";
import type { PlanSummary } from "@/domain/types";
import { usePlannerStore } from "@/store/usePlannerStore";

/** Recomputes the full plan summary whenever inputs, settings, or research change. */
export function usePlannerResults(): PlanSummary {
  const inputs = usePlannerStore((s) => s.inputs);
  const settings = usePlannerStore((s) => s.settings);
  const research = usePlannerStore((s) => s.research);
  return useMemo(() => {
    // Fold enabled research rewards into on-hand currency before planning.
    const credits: ResearchCredit[] = [];
    for (const line of RESEARCH_LINES) {
      if (!research[line.id]) continue;
      for (const r of line.rewards) {
        if (r.bossId) credits.push({ bossId: r.bossId, currency: r.currency, amount: r.amount });
      }
    }
    const credited = applyResearchCredits(Object.values(inputs), credits);
    return computePlanSummary(credited, settings);
  }, [inputs, settings, research]);
}
