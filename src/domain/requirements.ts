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

  // ---- XL Candy (levels 40→50) to max one Pokémon ----
  // XL is spent linearly across the 40→50 band at 296 XL for a regular Pokémon.
  const fromLevel = clamp(input.current.level, 40, 50);
  const toLevel = clamp(input.target.level, 40, 50);
  const xlBandFraction = Math.max(0, toLevel - fromLevel) / 10;
  const xlNeed = Math.round(GAME_CONFIG.xlToLevel50.standard * xlBandFraction);
  if (xlNeed > 0) out.xlCandy = xlNeed;

  // ---- Regular Candy (levels below 40) to raise one Pokémon toward 40 ----
  const candyFrom = clamp(input.current.level, 1, 40);
  const candyTo = clamp(input.target.level, 1, 40);
  const candyFraction = Math.max(0, candyTo - candyFrom) / 39;
  const candyNeed = Math.round(GAME_CONFIG.leveling.candyToLevel40 * candyFraction);
  if (candyNeed > 0) out.candy = candyNeed;

  // ---- Mega Energy (mega levels) ----
  // Energy depends only on the Mega Level goal (a per-species progression),
  // independent of how the Pokémon is leveled.
  if (boss.megaLevelEnergyTotals) {
    const totals = boss.megaLevelEnergyTotals;
    // The user's current Mega Level drives the start — no forced floor. At Mega
    // Level 0 (e.g. a Mewtwo you already own), reaching Mega Level 1 includes the
    // first-evolution cost (Mewtwo's 7,500); GO Fest-caught Mewtwo start at ≥1.
    const target = clamp(input.target.megaLevel, 0, totals.length - 1);
    const start = clamp(input.current.megaLevel, 0, totals.length - 1);
    const energyNeed = Math.max(0, totals[target] - totals[start]);
    if (energyNeed > 0) out.megaEnergy = energyNeed;
  }

  // Maxing N of a species multiplies every gross requirement: leveling a second
  // copy costs another full candy/XL climb, and (per product spec) energy scales
  // too. Net-need then subtracts the single shared on-hand pool.
  const quantity = Math.max(1, Math.round(input.quantity ?? 1));
  if (quantity > 1) {
    for (const key of Object.keys(out) as Currency[]) out[key] = (out[key] ?? 0) * quantity;
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
