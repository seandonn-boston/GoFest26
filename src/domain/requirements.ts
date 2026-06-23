import { GAME_CONFIG } from "@/data/config";
import { clamp } from "@/lib/math";
import type { BossInput, Currency, PokemonCopy, RaidBoss } from "./types";

/**
 * Gross requirement for ONE individual — its own level/megaLevel/variant/target,
 * before subtracting what's on hand. XL scales with the variant's 40→50 total
 * (regular 296 / shadow 360 / purified 272).
 */
export function grossForCopy(boss: RaidBoss, copy: PokemonCopy): Partial<Record<Currency, number>> {
  const out: Partial<Record<Currency, number>> = {};

  // ---- XL Candy (levels 40→50) ----
  const fromLevel = clamp(copy.current.level, 40, 50);
  const toLevel = clamp(copy.target.level, 40, 50);
  const xlNeed = Math.round((GAME_CONFIG.xlToLevel50[copy.variant] * Math.max(0, toLevel - fromLevel)) / 10);
  if (xlNeed > 0) out.xlCandy = xlNeed;

  // ---- Regular Candy (levels below 40) ----
  const candyFrom = clamp(copy.current.level, 1, 40);
  const candyTo = clamp(copy.target.level, 1, 40);
  const candyNeed = Math.round((GAME_CONFIG.leveling.candyToLevel40 * Math.max(0, candyTo - candyFrom)) / 39);
  if (candyNeed > 0) out.candy = candyNeed;

  // ---- Mega Energy (mega levels) ----
  if (boss.megaLevelEnergyTotals) {
    const totals = boss.megaLevelEnergyTotals;
    const target = clamp(copy.target.megaLevel, 0, totals.length - 1);
    const start = clamp(copy.current.megaLevel, 0, totals.length - 1);
    const energyNeed = Math.max(0, totals[target] - totals[start]);
    if (energyNeed > 0) out.megaEnergy = energyNeed;
  }

  return out;
}

/**
 * The individuals to plan for: the explicit `copies` list (in priority order) if
 * present, else a single default copy derived from current/target/variant,
 * repeated `quantity` times (the legacy "max N identical" behavior).
 */
export function copiesOf(input: BossInput): PokemonCopy[] {
  if (input.copies && input.copies.length) return input.copies;
  const single: Omit<PokemonCopy, "id"> = {
    variant: input.variant ?? "standard",
    current: { level: input.current.level, megaLevel: input.current.megaLevel },
    target: { level: input.target.level, megaLevel: input.target.megaLevel },
  };
  const quantity = Math.max(1, Math.round(input.quantity ?? 1));
  return Array.from({ length: quantity }, (_, i) => ({ ...single, id: `q${i}` }));
}

/**
 * Computes the *gross* amount of each currency required to reach the goal,
 * summed across every individual being maxed, before subtracting on-hand.
 */
export function computeGrossRequirement(boss: RaidBoss, input: BossInput): Partial<Record<Currency, number>> {
  const out: Partial<Record<Currency, number>> = {};
  for (const copy of copiesOf(input)) {
    const g = grossForCopy(boss, copy);
    for (const key of Object.keys(g) as Currency[]) out[key] = (out[key] ?? 0) + (g[key] ?? 0);
  }
  return out;
}

const heldOf = (input: BossInput): Record<Currency, number> => ({
  candy: input.current.candy,
  xlCandy: input.current.xlCandy,
  megaEnergy: input.current.megaEnergy,
});

/**
 * Subtracts what the user already holds, returning the net amount still needed
 * per currency (clamped at 0).
 */
export function computeNetNeed(boss: RaidBoss, input: BossInput): Partial<Record<Currency, number>> {
  const gross = computeGrossRequirement(boss, input);
  const net: Partial<Record<Currency, number>> = {};
  const held = heldOf(input);
  for (const key of Object.keys(gross) as Currency[]) {
    net[key] = Math.max(0, (gross[key] ?? 0) - held[key]);
  }
  return net;
}

export interface CopyNeed {
  copy: PokemonCopy;
  gross: Partial<Record<Currency, number>>;
  /** Net still needed for THIS copy after the shared on-hand pool is allocated
   *  to higher-priority copies first, then this one. */
  net: Partial<Record<Currency, number>>;
}

/**
 * Per-copy needs with the shared on-hand pool cascaded by priority: the
 * highest-priority copy absorbs the held Candy/XL/Energy first, the next copy
 * takes what's left, and so on — so the user can see "200 XL all went to the
 * first; the second still needs its full 296."
 */
export function perCopyNeeds(boss: RaidBoss, input: BossInput): CopyNeed[] {
  const remaining = heldOf(input);
  return copiesOf(input).map((copy) => {
    const gross = grossForCopy(boss, copy);
    const net: Partial<Record<Currency, number>> = {};
    for (const key of Object.keys(gross) as Currency[]) {
      const use = Math.min(remaining[key] ?? 0, gross[key] ?? 0);
      remaining[key] = (remaining[key] ?? 0) - use;
      const n = (gross[key] ?? 0) - use;
      if (n > 0) net[key] = n;
    }
    return { copy, gross, net };
  });
}
