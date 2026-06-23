// Infer a Pokémon's current LEVEL from the costs shown on its POWER-UP screen.
//
// The power-up screen shows the Stardust + Candy (below L40) or Stardust + XL
// Candy (L40→50) the NEXT power-up will cost. Those costs are fixed per level,
// so they back-solve the level. This is supplemental to the holdings scan: it
// fills only `current.level` and never the on-hand candy/XL pools (the numbers
// on this screen are a cost the player will NEED, not what they already have).
//
// Resolution:
//   • L40→50 (XL shown): Stardust + XL pin a single integer level (we can't tell
//     L41 from L41.5 — they cost the same — so a one-integer band is the most
//     precise truthful answer).
//   • Below L40 (Candy shown): Stardust + Candy share a 4-half-level tier, so the
//     band spans up to two integer levels.
//   • Stardust alone narrows to its dust tier; nothing readable → null.

import type { Variant } from "@/domain/types";
import { POWER_UP_COSTS, type PowerUpCost } from "@/data/powerUpCosts";

export interface LevelInference {
  /** Best single suggestion (the band's lower bound) to prefill, else null. */
  level: number | null;
  /** Lowest level consistent with the costs. */
  min: number;
  /** Highest level consistent with the costs. */
  max: number;
  /** True when the band is a single integer level (≤ one 0.5 step of ambiguity). */
  confident: boolean;
}

const NONE: LevelInference = { level: null, min: NaN, max: NaN, confident: false };

export interface PowerUpObservation {
  stardust?: number;
  /** Regular Candy cost (a sub-40 power-up screen). */
  candy?: number;
  /** XL Candy cost (a 40→50 power-up screen). */
  xl?: number;
  /** Variant of the individual being scanned (drives the sub-40 cost table). */
  variant?: Variant;
}

/** Rows to match against for this observation's variant + band. */
function candidateRows(obs: PowerUpObservation): PowerUpCost[] {
  // XL on screen ⇒ the standard 40→50 band (the only one GO Hub tabulates).
  if (obs.xl !== undefined) return POWER_UP_COSTS.filter((r) => r.variant === "standard" && r.xl !== undefined);
  const v = obs.variant ?? "standard";
  return POWER_UP_COSTS.filter((r) => r.variant === v && r.candy !== undefined);
}

/**
 * Infer the level from one power-up-screen observation. Returns the band of
 * consistent levels (and a single prefill suggestion). Requires at least a
 * Candy or XL reading — Stardust alone is too coarse to be useful on its own
 * unless it's all there is, in which case the dust tier is returned.
 */
export function inferLevelFromPowerUpCost(obs: PowerUpObservation): LevelInference {
  const hasCandy = obs.candy !== undefined;
  const hasXl = obs.xl !== undefined;
  const hasDust = obs.stardust !== undefined;
  if (!hasCandy && !hasXl && !hasDust) return NONE;

  const rows = candidateRows(obs).filter((r) => {
    if (hasXl && r.xl !== obs.xl) return false;
    if (hasCandy && r.candy !== obs.candy) return false;
    if (hasDust && r.stardust !== obs.stardust) return false;
    return true;
  });
  if (!rows.length) return NONE;

  const levels = rows.map((r) => r.level);
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  return { level: min, min, max, confident: max - min <= 0.5 };
}
