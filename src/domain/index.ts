import { getBoss } from "@/data";
import { addRange, midpoint, ZERO_RANGE } from "@/lib/math";
import { computeCapacity } from "./capacity";
import { computeBossResult } from "./raidsNeeded";
import { computeSchedule } from "./scheduler";
import { DEFAULT_SETTINGS, type PlannerSettings } from "./settings";
import type { BossInput, BossResult, PlanSummary, Range } from "./types";

export * from "./types";
export { computeBossResult } from "./raidsNeeded";
export { computeCapacity } from "./capacity";
export { computeSchedule } from "./scheduler";
export { computeGrossRequirement, computeNetNeed } from "./requirements";
export { DEFAULT_SETTINGS } from "./settings";
export type { PlannerSettings } from "./settings";
export { bossIsLocal, isScopeLocal, regionScopeLabel } from "./region";

/**
 * Top-level engine entry point: given the user's per-boss inputs, computes
 * results for every selected boss plus an aggregate capacity/feasibility view.
 */
export function computePlanSummary(
  inputs: BossInput[],
  settings: PlannerSettings = DEFAULT_SETTINGS,
): PlanSummary {
  const capacity = computeCapacity(settings);

  const results: BossResult[] = [];
  let totalNoBoost: Range = { ...ZERO_RANGE };
  let totalWithBoost: Range = { ...ZERO_RANGE };

  for (const input of inputs) {
    if (!input.selected) continue;
    const boss = getBoss(input.bossId);
    if (!boss) continue;
    const result = computeBossResult(boss, input);
    results.push(result);
    totalNoBoost = addRange(totalNoBoost, result.raidsNoBoost);
    totalWithBoost = addRange(totalWithBoost, result.raidsWithBoost);
  }

  const capacityMid = midpoint(capacity.totalRaids);
  const utilizationNoBoost = capacityMid > 0 ? midpoint(totalNoBoost) / capacityMid : 0;
  const utilizationWithBoost = capacityMid > 0 ? midpoint(totalWithBoost) / capacityMid : 0;

  // Feasible if even the worst-case (no-boost) plan fits within max capacity.
  const feasible = totalNoBoost.max <= capacity.totalRaids.max;

  const schedule = computeSchedule(inputs, results, capacity, settings);

  return {
    results,
    capacity,
    schedule,
    totalRaidsNoBoost: totalNoBoost,
    totalRaidsWithBoost: totalWithBoost,
    utilizationNoBoost,
    utilizationWithBoost,
    feasible,
  };
}
