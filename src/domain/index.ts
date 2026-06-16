import { getBoss } from "@/data";
import { addRange, midpoint, ZERO_RANGE } from "@/lib/math";
import { computeCapacity } from "./capacity";
import { collapseForms } from "./forms";
import { computeBossResult } from "./raidsNeeded";
import { computeSchedule } from "./scheduler";
import { DEFAULT_SETTINGS, type PlannerSettings } from "./settings";
import type { BossInput, BossResult, PlanSummary, Range } from "./types";

export * from "./types";
export { computeBossResult } from "./raidsNeeded";
export { computeCapacity } from "./capacity";
export { computeSchedule } from "./scheduler";
export { computeBlockPlan, rareCandyForecast, goalProgress, autoRemoteAllocations, globalPriorityFromBlocks, RISK_BANDS } from "./blockPlan";
export type { BlockPlan, BlockSpeciesShare, GoalProgress, RemotePlan, RiskBand, WeekendBlockPlan } from "./blockPlan";
export { megaBoostsForBoss, blockMegaBoosts, megaBoostSpecies, mergeMegaBoosts } from "./megaBoosts";
export type { MegaBoost, MegaKind } from "./megaBoosts";
export { computeGrossRequirement, computeNetNeed } from "./requirements";
export { applyResearchCredits } from "./research";
export type { ResearchCredit } from "./research";
export { DEFAULT_SETTINGS } from "./settings";
export type { PlannerSettings } from "./settings";
export { bossIsLocal, isScopeLocal, regionScopeLabel } from "./region";
export {
  collapseForms,
  formMembers,
  groupDisplayName,
  isSecondaryForm,
  primaryFormId,
  planningWindows,
  groupSpansBothDays,
  remoteCapFor,
} from "./forms";

/**
 * Top-level engine entry point: given the user's per-boss inputs, computes
 * results for every selected boss plus an aggregate capacity/feasibility view.
 */
export function computePlanSummary(
  inputs: BossInput[],
  settings: PlannerSettings = DEFAULT_SETTINGS,
  remoteAllocations: Record<string, number> = {},
): PlanSummary {
  const capacity = computeCapacity(settings);

  // Multi-form species (Giratina, Dialga, …) collapse to one shared-resource
  // target so their Candy/XL pool isn't counted twice.
  inputs = collapseForms(inputs);

  const results: BossResult[] = [];
  let totalRaids: Range = { ...ZERO_RANGE };

  for (const input of inputs) {
    if (!input.selected) continue;
    const boss = getBoss(input.bossId);
    if (!boss) continue;
    const result = computeBossResult(boss, input);
    results.push(result);
    totalRaids = addRange(totalRaids, result.raids);
  }

  // Remote Raid Passes add capacity on top of the in-person weekend raids, so the
  // "capacity used" gauge measures demand against both. The pool is the sum of the
  // user's per-species remote allocations, capped at the 60-pass budget.
  const remotePool = settings.useRemoteRaids
    ? Math.min(
        settings.remoteRaidBudget,
        Object.values(remoteAllocations).reduce((s, n) => s + Math.max(0, Math.round(n || 0)), 0),
      )
    : 0;
  const effectiveMid = midpoint(capacity.totalRaids) + remotePool;
  const utilization = effectiveMid > 0 ? midpoint(totalRaids) / effectiveMid : 0;
  const feasible = totalRaids.max <= capacity.totalRaids.max + remotePool;

  const schedule = computeSchedule(inputs, results, capacity, settings);

  return { results, capacity, schedule, totalRaids, remotePool, utilization, feasible };
}
