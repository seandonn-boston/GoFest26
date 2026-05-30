import { ceilDiv, ZERO_RANGE } from "@/lib/math";
import { buddyMultiplier } from "./buddyBoost";
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

/** Raids needed to cover one currency, given a per-raid reward range. */
function raidsForCurrency(needed: number, reward: Range, boost: number): Range {
  if (needed <= 0) return { ...ZERO_RANGE };
  return {
    // Best-case rewards (max, boosted) => fewest raids.
    min: ceilDiv(needed, reward.max * boost),
    // Worst-case rewards (min, boosted) => most raids.
    max: ceilDiv(needed, reward.min * boost),
  };
}

function rewardFor(boss: RaidBoss, currency: Currency): Range | undefined {
  if (currency === "candy") return boss.rewards.candy;
  if (currency === "xlCandy") return boss.rewards.xlCandy;
  return boss.rewards.megaEnergy;
}

/** Picks the currency that demands the most raids (worst case). */
function bindingOf(
  perCurrency: Partial<Record<Currency, Range>>,
): Currency | null {
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
  const net = computeNetNeed(boss, input);

  const needs: Partial<Record<Currency, CurrencyNeed>> = {};
  const noBoostRanges: Partial<Record<Currency, Range>> = {};
  const boostRanges: Partial<Record<Currency, Range>> = {};

  for (const c of CURRENCY_ORDER) {
    const needed = net[c];
    const reward = rewardFor(boss, c);
    if (needed === undefined || needed <= 0 || !reward) continue;

    const noBoost = raidsForCurrency(needed, reward, 1);
    const boosted = raidsForCurrency(needed, reward, buddyMultiplier(c));

    needs[c] = { needed, raidsRange: noBoost };
    noBoostRanges[c] = noBoost;
    boostRanges[c] = boosted;
  }

  const bindingNoBoost = bindingOf(noBoostRanges);
  const bindingBoost = bindingOf(boostRanges);

  return {
    bossId: boss.id,
    needs,
    raidsNoBoost: bindingNoBoost ? noBoostRanges[bindingNoBoost]! : { ...ZERO_RANGE },
    raidsWithBoost: bindingBoost ? boostRanges[bindingBoost]! : { ...ZERO_RANGE },
    bindingCurrency: bindingNoBoost,
  };
}
