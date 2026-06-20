import { GAME_CONFIG } from "@/data/config";
import { ceilDiv, ZERO_RANGE } from "@/lib/math";
import { computeNetNeed } from "./requirements";
import type {
  BossInput,
  BossResult,
  Currency,
  CurrencyNeed,
  RaidBoss,
  Range,
} from "./types";

const CURRENCY_ORDER: Currency[] = ["megaEnergy", "xlCandy", "candy"];

/**
 * Per-raid reward for a currency, accounting for the catch toggles:
 * - Mega Energy comes from defeating the raid (always, even if you run).
 * - Candy = catch candy + transfer candy (+1 if a matching Mega buddy is active),
 *   and is 0 if you skip the catch.
 * - XL Candy = catch XL, 0 if you skip the catch.
 * Returns undefined when this boss can't yield that currency under the toggles.
 */
function perRaidReward(
  boss: RaidBoss,
  currency: Currency,
  input: BossInput,
): Range | undefined {
  const c = GAME_CONFIG.catch;
  const skipCatch = input.skipCatch ?? false;
  const megaBuddy = input.megaBuddy ?? true;

  if (currency === "megaEnergy") return boss.rewards.megaEnergy;
  if (skipCatch) return undefined; // ran from the encounter → no catch rewards

  if (currency === "candy") {
    const bonus = c.transferCandy + (megaBuddy ? c.buddyBonusCandy : 0);
    return { min: boss.rewards.candy.min + bonus, max: boss.rewards.candy.max + bonus };
  }
  return boss.rewards.xlCandy; // xlCandy
}

function raidsForCurrency(needed: number, reward: Range): Range {
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

export function computeBossResult(boss: RaidBoss, input: BossInput): BossResult {
  return bossResultFromNeeds(boss, input, computeNetNeed(boss, input));
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
): BossResult {
  const needs: Partial<Record<Currency, CurrencyNeed>> = {};
  const ranges: Partial<Record<Currency, Range>> = {};

  for (const c of CURRENCY_ORDER) {
    const needed = net[c];
    const reward = perRaidReward(boss, c, input);
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
