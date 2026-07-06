import { GAME_CONFIG } from "@/data/config";
import { ceilDiv, ZERO_RANGE } from "@/lib/math";
import { computeNetNeed } from "./requirements";
import type { CalibrationMetric } from "./settings";
import type { BossInput, BossResult, Currency, CurrencyNeed, RaidBoss, Range } from "./types";

const CURRENCY_ORDER: Currency[] = ["megaEnergy", "xlCandy", "candy"];

type Calibration = Partial<Record<CalibrationMetric, number>>;

const XL_BONUS_BY_LEVEL = GAME_CONFIG.megaCatchBoost.xlBonusByLevel;
const GO_PASS = GAME_CONFIG.goPassDeluxe;

/** True when this boss's tier counts as "five-star or higher" for the GO Pass
 *  Deluxe per-catch bonuses (plain Mega Raids sit below Tier 5 → excluded). */
function goPassEligible(boss: RaidBoss): boolean {
  return (GO_PASS.tiers as readonly string[]).includes(boss.tier);
}
const L4_TYPES: readonly string[] = GAME_CONFIG.megaCatchBoost.l4Types;

/** True when the boss's typing includes one of the Level-4 (Super Max) Mega
 *  types, so the per-boss "Level-4 Mega active" XL boost can apply. */
export function isL4Eligible(boss: RaidBoss): boolean {
  return (boss.types ?? []).some((t) => L4_TYPES.includes(t));
}

/**
 * Guaranteed extra Candy XL per catch from a same-type Mega buddy under the
 * current toggles. 0 = no boost. It's a whole-candy bump (a guaranteed +1 at a
 * boosting Mega Level), added to the catch-XL range — NOT a fractional
 * multiplier — so a base 1–3 roll floors to 2–4. Requires an active matching
 * buddy (megaBuddy on); the per-boss l4Buddy overrides the assumed level to 4
 * when the boss is type-eligible. Returns the whole Candy so callers can show
 * the "+N buddy XL" math.
 */
export function xlBuddyBonus(boss: RaidBoss, input: BossInput, megaBuddyLevel: number): number {
  if (!(input.megaBuddy ?? true)) return 0;
  const level = input.l4Buddy && isL4Eligible(boss) ? 4 : megaBuddyLevel;
  const idx = Math.max(0, Math.min(XL_BONUS_BY_LEVEL.length - 1, Math.round(level)));
  return XL_BONUS_BY_LEVEL[idx] ?? 0;
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
  /** xlCandy: guaranteed same-type Mega buddy Candy XL added to `base` (whole candy). */
  xlBonus?: number;
  /** candy: transfer + mega-buddy candy added to `base`. */
  candyBonus?: number;
  /** GO Pass Deluxe per-catch bonus folded into `range` (candy +3 / XL +1). */
  goPassBonus?: number;
}

export function rewardBreakdown(
  boss: RaidBoss,
  currency: Currency,
  input: BossInput,
  calibration: Calibration = {},
  megaBuddyLevel = 1,
  goPassDeluxe = false,
): RewardBreakdown {
  const c = GAME_CONFIG.catch;
  const megaBuddy = input.megaBuddy ?? true;
  const passEligible = goPassDeluxe && goPassEligible(boss);

  const metric = calibrationMetric(boss, currency);
  const cal = metric ? calibration[metric] : undefined;
  const calibrated = cal && cal > 0 ? cal : undefined;

  if (currency === "megaEnergy") {
    if (calibrated) return { range: { min: calibrated, max: calibrated }, calibrated };
    return { range: boss.rewards.megaEnergy, base: boss.rewards.megaEnergy };
  }

  if (currency === "candy") {
    const candyBonus = c.transferCandy + (megaBuddy ? c.buddyBonusCandy : 0);
    const goPassBonus = passEligible ? GO_PASS.extraCandyPerCatch : 0;
    const base = boss.rewards.candy;
    return {
      range: { min: base.min + candyBonus + goPassBonus, max: base.max + candyBonus + goPassBonus },
      base,
      candyBonus,
      goPassBonus: goPassBonus || undefined,
    };
  }
  // xlCandy. A logged calibration value already reflects the player's own mega,
  // so it's used as-is; otherwise the same-type Mega buddy adds a guaranteed
  // whole Candy XL to the assumed range (0 = none) — a 1–3 catch floors to 2–4.
  if (calibrated) return { range: { min: calibrated, max: calibrated }, calibrated };
  const xlBonus = xlBuddyBonus(boss, input, megaBuddyLevel);
  const goPassBonus = passEligible ? GO_PASS.extraXlPerCatch : 0;
  const base = boss.rewards.xlCandy;
  const bump = xlBonus + goPassBonus;
  const range = bump === 0 ? base : { min: base.min + bump, max: base.max + bump };
  return { range, base, xlBonus, goPassBonus: goPassBonus || undefined };
}

function perRaidReward(
  boss: RaidBoss,
  currency: Currency,
  input: BossInput,
  calibration: Calibration = {},
  megaBuddyLevel = 1,
  goPassDeluxe = false,
): Range | undefined {
  return rewardBreakdown(boss, currency, input, calibration, megaBuddyLevel, goPassDeluxe).range;
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
  goPassDeluxe = false,
): BossResult {
  return bossResultFromNeeds(boss, input, computeNetNeed(boss, input), calibration, megaBuddyLevel, goPassDeluxe);
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
  goPassDeluxe = false,
): BossResult {
  const needs: Partial<Record<Currency, CurrencyNeed>> = {};
  const ranges: Partial<Record<Currency, Range>> = {};

  for (const c of CURRENCY_ORDER) {
    const needed = net[c];
    const reward = perRaidReward(boss, c, input, calibration, megaBuddyLevel, goPassDeluxe);
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
