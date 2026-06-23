import { getBoss, MEWTWO_X_ID, MEWTWO_Y_ID } from "@/data";
import { addRange, clamp, midpoint, ZERO_RANGE } from "@/lib/math";
import { computeCapacity } from "./capacity";
import { collapseForms } from "./forms";
import { bossResultFromNeeds, computeBossResult } from "./raidsNeeded";
import { computeNetNeed } from "./requirements";
import { computeSchedule } from "./scheduler";
import { DEFAULT_SETTINGS, type PlannerSettings } from "./settings";
import type { BossInput, BossResult, Currency, PlanSummary, Range } from "./types";

export * from "./types";
export { computeBossResult, isL4Eligible, xlBoostFactor, rewardBreakdown, raidsForCurrency } from "./raidsNeeded";
export type { RewardBreakdown } from "./raidsNeeded";
export { explainCurrency } from "./explain";
export type { CurrencyExplanation, ExplainLine, Token, EditField } from "./explain";
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
    const boss = getBoss(input.bossId);
    if (!boss) continue;
    results.push(computeBossResult(boss, input, calibration, megaBuddyLevel));
  }

  // Mega Mewtwo X & Y draw their 40→50 XL/Candy from ONE shared pool, farmed
  // from BOTH days' raids — so when both forms are raided, split that leveling
  // evenly across them instead of piling the whole climb onto X's (Saturday)
  // card as if a single day had to cover it.
  splitMewtwoLeveling(results, inputs, calibration, megaBuddyLevel);

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

/**
 * Re-split the shared Mega Mewtwo leveling (40→50 XL + any sub-40 Candy) evenly
 * across both forms, in place. The shared card stores the climb on one form (X
 * when selected), so X's result otherwise absorbs the entire XL goal — making it
 * read as if all ~100 leveling raids must happen on Saturday. Since Mewtwo XL is
 * farmed from X (Sat) and Y (Sun) raids alike, half belongs on each form's card.
 * Only runs when BOTH forms are raided; otherwise the sole form keeps it all.
 */
function splitMewtwoLeveling(
  results: BossResult[],
  inputs: BossInput[],
  calibration: PlannerSettings["calibration"] = {},
  megaBuddyLevel = 1,
): void {
  const xi = inputs.find((i) => i.bossId === MEWTWO_X_ID && i.selected);
  const yi = inputs.find((i) => i.bossId === MEWTWO_Y_ID && i.selected);
  const bossX = getBoss(MEWTWO_X_ID);
  const bossY = getBoss(MEWTWO_Y_ID);
  if (!xi || !yi || !bossX || !bossY) return;

  const netX = computeNetNeed(bossX, xi);
  const netY = computeNetNeed(bossY, yi);
  // The leveling lives entirely on the owner form, so summing both forms' XL/
  // Candy net-need recovers the full shared climb regardless of which owns it.
  const levelXl = (netX.xlCandy ?? 0) + (netY.xlCandy ?? 0);
  const levelCandy = (netX.candy ?? 0) + (netY.candy ?? 0);
  if (levelXl <= 0 && levelCandy <= 0) return;

  // Smart balance (not a blind 50/50): each form's own day-locked Mega Energy
  // raids already yield XL, so weigh the climb by that. Convert energy + leveling
  // to raids and load-balance the leveling so the two forms' TOTAL raids come out
  // as even as possible — if one form's energy alone already exceeds half the
  // climb it keeps its energy raids and the lighter form absorbs the remainder;
  // when leveling dominates both, it settles to an even split. `fracX` is X's
  // share of the leveling currency.
  const enMid = bossX.rewards.megaEnergy ? midpoint(bossX.rewards.megaEnergy) : 0;
  const xlMid = bossX.rewards.xlCandy ? midpoint(bossX.rewards.xlCandy) : 0;
  const ex = enMid > 0 ? (netX.megaEnergy ?? 0) / enMid : 0; // X energy in raids
  const ey = enMid > 0 ? (netY.megaEnergy ?? 0) / enMid : 0; // Y energy in raids
  const lr = xlMid > 0 ? levelXl / xlMid : 0; // leveling in raids
  let fracX = 0.5;
  if (lr > 0) {
    const total = Math.max(ex + ey, lr); // minimal combined raids
    const rx = clamp(total / 2, ex, total - ey); // X's balanced total, ≥ its energy floor
    fracX = total > 0 ? rx / total : 0.5;
  }
  const split = (n: number): [number, number] => {
    const x = Math.round(n * fracX);
    return [x, n - x];
  };
  const [xlX, xlY] = split(levelXl);
  const [candyX, candyY] = split(levelCandy);
  const needsFor = (energy: number | undefined, xl: number, candy: number): Partial<Record<Currency, number>> => {
    const out: Partial<Record<Currency, number>> = {};
    if (energy && energy > 0) out.megaEnergy = energy;
    if (xl > 0) out.xlCandy = xl;
    if (candy > 0) out.candy = candy;
    return out;
  };

  const replace = (r: BossResult) => {
    const i = results.findIndex((x) => x.bossId === r.bossId);
    if (i >= 0) results[i] = r;
  };
  replace(bossResultFromNeeds(bossX, xi, needsFor(netX.megaEnergy, xlX, candyX), calibration, megaBuddyLevel));
  replace(bossResultFromNeeds(bossY, yi, needsFor(netY.megaEnergy, xlY, candyY), calibration, megaBuddyLevel));
}
