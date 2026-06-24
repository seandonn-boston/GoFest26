import { GAME_CONFIG } from "@/data/config";
import { ceilDiv, ZERO_RANGE } from "@/lib/math";
import { computeNetNeed } from "./requirements";
import type { CalibrationMetric } from "./settings";
import type {
  BossInput,
  BossResult,
  Currency,
  CurrencyNeed,
  RaidBoss,
  Range,
} from "./types";

const CURRENCY_ORDER: Currency[] = ["megaEnergy", "xlCandy", "candy"];

type Calibration = Partial<Record<CalibrationMetric, number>>;

const XL_BOOST_BY_LEVEL = GAME_CONFIG.megaCatchBoost.xlByLevel;
const L4_TYPES: readonly string[] = GAME_CONFIG.megaCatchBoost.l4Types;

/** True when the boss's typing includes one of the Level-4 (Super Max) Mega
 *  types, so the per-boss "Level-4 Mega active" XL boost can apply. */
export function isL4Eligible(boss: RaidBoss): boolean {
  return (boss.types ?? []).some((t) => L4_TYPES.includes(t));
}

/**
 * Same-type Mega buddy XL multiplier for this boss under the current toggles.
 * 1 = no boost. Requires an active matching buddy (megaBuddy on); the per-boss
 * l4Buddy overrides the assumed level to 4 when the boss is type-eligible.
 * Returns just the multiplier so callers can show the math.
 */
export function xlBoostFactor(boss: RaidBoss, input: BossInput, megaBuddyLevel: number): number {
  if (!(input.megaBuddy ?? true)) return 1;
  const level = input.l4Buddy && isL4Eligible(boss) ? 4 : megaBuddyLevel;
  const idx = Math.max(0, Math.min(XL_BOOST_BY_LEVEL.length - 1, Math.round(level)));
  return 1 + (XL_BOOST_BY_LEVEL[idx] ?? 0);
}

/** Which calibratable metric (if any) a currency maps to for this boss's tier. */
function calibrationMetric(boss: RaidBoss, currency: Currency): CalibrationMetric | null {
  if (currency === "megaEnergy") return boss.tier === "super-mega" ? "superMegaEnergy" : "megaEnergy";
  if (currency === "xlCandy") return boss.tier === "mega" ? "megaXl" : "legendaryXl";
  return null; // catch Candy isn't calibrated (its +transfer/+buddy bonus is ambiguous)
}

/**
 * Per-raid reward for a currency, accounting for the catch toggles:
 * - Mega Energy comes from defeating the raid (always, even if you run).
 * - Candy = catch candy + transfer candy (+1 if a matching Mega buddy is active).
 * - XL Candy = catch XL.
 * A logged calibration value overrides the assumed range with a point estimate.
 * Quick-catch (forfeiting catch Candy/XL) is now a per-block choice on the results
 * tiles, so it's applied there rather than to this whole-goal reward.
 * Returns undefined when this boss can't yield that currency under the toggles.
 */
/** The per-raid reward for a currency, broken into its parts so a tooltip can
 *  show the exact math the engine used. `range` is what feeds raids-needed. */
export interface RewardBreakdown {
  range: Range | undefined;
  /** A logged calibration value, used as-is (no boost re-applied). */
  calibrated?: number;
  /** The pre-boost / pre-bonus reward range from the boss data. */
  base?: Range;
  /** xlCandy: same-type Mega buddy boost multiplier applied to `base`. */
  boostFactor?: number;
  /** candy: transfer + mega-buddy candy added to `base`. */
  candyBonus?: number;
}

export function rewardBreakdown(
  boss: RaidBoss,
  currency: Currency,
  input: BossInput,
  calibration: Calibration = {},
  megaBuddyLevel = 1,
): RewardBreakdown {
  const c = GAME_CONFIG.catch;
  const megaBuddy = input.megaBuddy ?? true;

  const metric = calibrationMetric(boss, currency);
  const cal = metric ? calibration[metric] : undefined;
  const calibrated = cal && cal > 0 ? cal : undefined;

  if (currency === "megaEnergy") {
    if (calibrated) return { range: { min: calibrated, max: calibrated }, calibrated };
    return { range: boss.rewards.megaEnergy, base: boss.rewards.megaEnergy };
  }

  if (currency === "candy") {
    const candyBonus = c.transferCandy + (megaBuddy ? c.buddyBonusCandy : 0);
    const base = boss.rewards.candy;
    return { range: { min: base.min + candyBonus, max: base.max + candyBonus }, base, candyBonus };
  }
  // xlCandy. A logged calibration value already reflects the player's own mega,
  // so it's used as-is; otherwise the assumed range scales by the same-type Mega
  // buddy XL boost (1 = none).
  if (calibrated) return { range: { min: calibrated, max: calibrated }, calibrated };
  const boostFactor = xlBoostFactor(boss, input, megaBuddyLevel);
  const base = boss.rewards.xlCandy;
  const range = boostFactor === 1 ? base : { min: base.min * boostFactor, max: base.max * boostFactor };
  return { range, base, boostFactor };
}

function perRaidReward(
  boss: RaidBoss,
  currency: Currency,
  input: BossInput,
  calibration: Calibration = {},
  megaBuddyLevel = 1,
): Range | undefined {
  return rewardBreakdown(boss, currency, input, calibration, megaBuddyLevel).range;
}

export function raidsForCurrency(needed: number, reward: Range): Range {
  if (needed <= 0) return { ...ZERO_RANGE };
  return {
    min: ceilDiv(needed, reward.max), // best-case rolls → fewest raids
    max: ceilDiv(needed, reward.min), // worst-case rolls → most raids
  };
}

function bindingOf(perCurrency: Partial<Record<Currency, Range>>): Currency | null {
  let binding: Currency | null = null;
  let worst = -1;
  for (const c of CURRENCY_ORDER) {
    const r = perCurrency[c];
    if (r && r.max > worst) {
      worst = r.max;
      binding = c;
    }
  }
  return binding;
}

export function computeBossResult(
  boss: RaidBoss,
  input: BossInput,
  calibration: Calibration = {},
  megaBuddyLevel = 1,
): BossResult {
  return bossResultFromNeeds(boss, input, computeNetNeed(boss, input), calibration, megaBuddyLevel);
}

/**
 * Build a result from an explicit net-need map (rather than the boss's own
 * computed needs). Used to re-split the shared Mega Mewtwo leveling across both
 * forms: the XL/Candy climb is farmed from X (Sat) AND Y (Sun) raids alike, so
 * each form should carry half of it on top of its own day-locked Mega Energy.
 */
export function bossResultFromNeeds(
  boss: RaidBoss,
  input: BossInput,
  net: Partial<Record<Currency, number>>,
  calibration: Calibration = {},
  megaBuddyLevel = 1,
): BossResult {
  const needs: Partial<Record<Currency, CurrencyNeed>> = {};
  const ranges: Partial<Record<Currency, Range>> = {};

  for (const c of CURRENCY_ORDER) {
    const needed = net[c];
    const reward = perRaidReward(boss, c, input, calibration, megaBuddyLevel);
    if (needed === undefined || needed <= 0 || !reward || reward.max <= 0) continue;

    const range = raidsForCurrency(needed, reward);
    needs[c] = { needed, raidsRange: range };
    ranges[c] = range;
  }

  const binding = bindingOf(ranges);
  return {
    bossId: boss.id,
    needs,
    raids: binding ? ranges[binding]! : { ...ZERO_RANGE },
    bindingCurrency: binding,
  };
}
