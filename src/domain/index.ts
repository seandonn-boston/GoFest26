import { getBoss, MEWTWO_X_ID, MEWTWO_Y_ID } from "@/data";
import { addRange, midpoint, ZERO_RANGE } from "@/lib/math";
import { computeCapacity } from "./capacity";
import { collapseForms } from "./forms";
import { computeBossResult } from "./raidsNeeded";
import { computeMewtwoResults } from "./mewtwo";
export { computeMewtwoResults, perMewtwoCopyNeeds } from "./mewtwo";
export type { MewtwoCopyNeed } from "./mewtwo";
import { computeSchedule } from "./scheduler";
import { DEFAULT_SETTINGS, type PlannerSettings } from "./settings";
import type { BossInput, BossResult, PlanSummary, Range } from "./types";

export * from "./types";
export { computeBossResult, isL4Eligible, xlBoostFactor, rewardBreakdown, raidsForCurrency } from "./raidsNeeded";
export type { RewardBreakdown } from "./raidsNeeded";
export { explainCurrency } from "./explain";
export type { CurrencyExplanation, ExplainLine, Token, EditField } from "./explain";
export {
  explainTotalRaids,
  explainRaidsPerHour,
  explainMaxRaids,
  explainUtilization,
  explainGoalProgress,
  explainPassCost,
} from "./explainPlan";
export type { Explanation } from "./explainPlan";
export { computeCapacity } from "./capacity";
export { computeSchedule } from "./scheduler";
export { computeBlockPlan, rareCandyForecast, goalProgress, autoRemoteAllocations, globalPriorityFromBlocks, RISK_BANDS } from "./blockPlan";
export type { BlockPlan, BlockSpeciesShare, GoalProgress, RemotePlan, RiskBand, WeekendBlockPlan } from "./blockPlan";
export { computeRoadPlan } from "./roadOfLegends";
export type { RoadPlan, RoadDayPlan } from "./roadOfLegends";
export { computePassCost, linkChargeCost } from "./passEconomy";
export type { PassCost, PassCostLine } from "./passEconomy";
export { megaBoostsForBoss, blockMegaBoosts, megaBoostSpecies, mergeMegaBoosts } from "./megaBoosts";
export type { MegaBoost, MegaKind } from "./megaBoosts";
export { computeGrossRequirement, computeNetNeed, grossForCopy, copiesOf, perCopyNeeds } from "./requirements";
export type { CopyNeed } from "./requirements";
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

  const calibration = settings.calibration ?? {};
  const megaBuddyLevel = settings.megaBuddyLevel ?? 1;
  const results: BossResult[] = [];
  for (const input of inputs) {
    if (!input.selected) continue;
    // Mewtwo X & Y share one underlying Mewtwo (independent X/Y mega energy, one
    // 40→50 leveling pool), so they're computed together below — not per-boss.
    if (input.bossId === MEWTWO_X_ID || input.bossId === MEWTWO_Y_ID) continue;
    const boss = getBoss(input.bossId);
    if (!boss) continue;
    results.push(computeBossResult(boss, input, calibration, megaBuddyLevel));
  }
  results.push(...computeMewtwoResults(inputs, calibration, megaBuddyLevel));

  let totalRaids: Range = { ...ZERO_RANGE };
  for (const r of results) totalRaids = addRange(totalRaids, r.raids);

  // Remote raids add capacity on top of the in-person weekend raids, so the
  // "capacity used" gauge measures demand against both. Remote passes are
  // unlimited in count (GO Fest 2026), so the pool is bounded by remote TIME —
  // capped at the time-based remote capacity rather than a pass budget.
  const remotePool = settings.useRemoteRaids
    ? Math.min(
        midpoint(capacity.remoteCapacity),
        Object.values(remoteAllocations).reduce((s, n) => s + Math.max(0, Math.round(n || 0)), 0),
      )
    : 0;
  const effectiveMid = midpoint(capacity.totalRaids) + remotePool;
  const utilization = effectiveMid > 0 ? midpoint(totalRaids) / effectiveMid : 0;
  const feasible = totalRaids.max <= capacity.totalRaids.max + remotePool;

  const schedule = computeSchedule(inputs, results, capacity, settings);

  return { results, capacity, schedule, totalRaids, remotePool, utilization, feasible };
}
