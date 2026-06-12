import { getBoss } from "@/data";
import { addRange, midpoint, ZERO_RANGE } from "@/lib/math";
import { computeCapacity } from "./capacity";
import { computeBossResult } from "./raidsNeeded";
import { computeSchedule } from "./scheduler";
import { DEFAULT_SETTINGS, MAX_REMOTE_RAIDS, type PlannerSettings } from "./settings";
import type { BossInput, BossResult, PlanSummary, Range } from "./types";

export * from "./types";
export { computeBossResult } from "./raidsNeeded";
export { computeCapacity } from "./capacity";
export { computeSchedule } from "./scheduler";
export { computeBlockPlan, rareCandyForecast, RISK_BANDS } from "./blockPlan";
export type { BlockPlan, BlockSpeciesShare, RemotePlan, RiskBand, WeekendBlockPlan } from "./blockPlan";
export { computeGrossRequirement, computeNetNeed } from "./requirements";
export { applyResearchCredits } from "./research";
export type { ResearchCredit } from "./research";
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
  let totalRaids: Range = { ...ZERO_RANGE };

  for (const input of inputs) {
    if (!input.selected) continue;
    const boss = getBoss(input.bossId);
    if (!boss) continue;
    const result = computeBossResult(boss, input);
    results.push(result);
    totalRaids = addRange(totalRaids, result.raids);
  }

  // Remote Raid Passes add a flat pool of capacity on top of the in-person
  // weekend raids, so the "capacity used" gauge measures demand against both.
  const remotePool = settings.useRemoteRaids
    ? Math.max(0, Math.min(Math.round(settings.remoteRaidCount), MAX_REMOTE_RAIDS))
    : 0;
  const effectiveMid = midpoint(capacity.totalRaids) + remotePool;
  const utilization = effectiveMid > 0 ? midpoint(totalRaids) / effectiveMid : 0;
  const feasible = totalRaids.max <= capacity.totalRaids.max + remotePool;

  const schedule = computeSchedule(inputs, results, capacity, settings);

  return { results, capacity, schedule, totalRaids, remotePool, utilization, feasible };
}
