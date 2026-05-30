import { GAME_CONFIG } from "@/data/config";
import { clamp } from "@/lib/math";
import type { BossInput, Currency, RaidBoss } from "./types";

/**
 * Computes the *gross* amount of each currency required to reach the goal,
 * before subtracting what the user already has on hand.
 */
export function computeGrossRequirement(
  boss: RaidBoss,
  input: BossInput,
): Partial<Record<Currency, number>> {
  const out: Partial<Record<Currency, number>> = {};

  // ---- XL Candy (levels 40→50) ----
  // XL is spent linearly across the 40→50 band in this model. A target level
  // at or below 40 needs no XL; level 50 needs the full xlToLevel50 amount.
  const xlTotal = GAME_CONFIG.xlToLevel50[input.variant];
  const fromLevel = clamp(input.current.level, 40, 50);
  const toLevel = clamp(input.target.level, 40, 50);
  const xlBandFraction = Math.max(0, toLevel - fromLevel) / 10;
  const xlNeed = Math.round(xlTotal * xlBandFraction);
  if (xlNeed > 0) out.xlCandy = xlNeed;

  // ---- Regular Candy (levels below 40) ----
  // Only relevant when starting below level 40; coarse linear estimate.
  const candyFrom = clamp(input.current.level, 1, 40);
  const candyTo = clamp(input.target.level, 1, 40);
  const candyFraction = Math.max(0, candyTo - candyFrom) / 39;
  const candyNeed = Math.round(GAME_CONFIG.leveling.candyToLevel40 * candyFraction);
  if (candyNeed > 0) out.candy = candyNeed;

  // ---- Mega Energy (mega levels) ----
  if (boss.megaLevelEnergyTotals) {
    const totals = boss.megaLevelEnergyTotals;
    // GO Fest-caught specimens come pre-unlocked with >= 1 mega level and waive
    // the initial evolution cost, so the effective starting level is >= 1.
    const startLevel = boss.goFestPreUnlocked
      ? Math.max(input.current.megaLevel, 1)
      : input.current.megaLevel;
    const target = clamp(input.target.megaLevel, 0, totals.length - 1);
    const start = clamp(startLevel, 0, totals.length - 1);
    const energyNeed = Math.max(0, totals[target] - totals[start]);
    if (energyNeed > 0) out.megaEnergy = energyNeed;
  }

  return out;
}

/**
 * Subtracts what the user already holds, returning the net amount still needed
 * per currency (clamped at 0).
 */
export function computeNetNeed(
  boss: RaidBoss,
  input: BossInput,
): Partial<Record<Currency, number>> {
  const gross = computeGrossRequirement(boss, input);
  const net: Partial<Record<Currency, number>> = {};
  const held: Record<Currency, number> = {
    candy: input.current.candy,
    xlCandy: input.current.xlCandy,
    megaEnergy: input.current.megaEnergy,
  };
  for (const key of Object.keys(gross) as Currency[]) {
    const remaining = Math.max(0, (gross[key] ?? 0) - held[key]);
    net[key] = remaining;
  }
  return net;
}
