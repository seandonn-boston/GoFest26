// Exact Pokémon GO power-up costs, per half-level, per variant.
//
// These are the numbers shown on the in-game POWER-UP screen: the Stardust +
// Candy (below level 40) or Stardust + XL Candy (levels 40→50) it costs to do
// the NEXT power-up while the Pokémon sits at a given level. They are a COST to
// reach the next level, never a holdings amount — which is exactly why a
// power-up screenshot lets us back-solve the current level without touching the
// player's on-hand candy/XL pools.
//
// sources (exact tables, every half-level):
//   https://pokemongohub.net/post/guide/guide-to-power-up-costs-in-pokemon-go/
//   https://pokemongohub.net/post/guide/xl-candy-guide-how-to-get-power-up-costs-and-mechanics/
//
// Coverage:
//   • Standard / Lucky / Shadow / Purified — Stardust + Candy for every readable
//     half-level (Shadow from L8, Purified from L25, matching where the game can
//     produce them).
//   • Standard — Stardust + XL Candy for L41→50.5. GO Hub only tabulates the
//     standard 40→50 band per-level (Shadow/Purified differ only in their XL
//     TOTALS — 360 / 272 vs 296 — with no published per-level breakdown), so the
//     XL band here is standard-only and the resolver scopes 40+ inference to it.

import type { Variant } from "@/domain/types";

/** One power-up cost row: the cost to go from `level` to `level + 0.5`. */
export interface PowerUpCost {
  /** Current level the costs are shown at (1, 1.5, … 50, 50.5). */
  level: number;
  /** Variant the costs apply to. */
  variant: Variant | "lucky";
  /** Stardust cost for the next power-up. */
  stardust: number;
  /** Regular Candy cost (below level 40), else undefined. */
  candy?: number;
  /** XL Candy cost (levels 40→50), else undefined. */
  xl?: number;
}

// ---------------------------------------------------------------------------
// Tier definitions — the published step pattern. Encoded once and expanded to
// per-half-level rows below, so the data stays auditable against the source.
// ---------------------------------------------------------------------------

const HALF_LEVELS = (lo: number, hi: number): number[] => {
  const out: number[] = [];
  for (let l = lo; l <= hi + 1e-9; l += 0.5) out.push(Math.round(l * 2) / 2);
  return out;
};

/** Standard Stardust by the whole level a 4-half-level tier STARTS at (1,3,…,39). */
const STD_DUST_TIERS: Record<number, number> = {
  1: 200, 3: 400, 5: 600, 7: 800, 9: 1000,
  11: 1300, 13: 1600, 15: 1900, 17: 2200, 19: 2500,
  21: 3000, 23: 3500, 25: 4000, 27: 4500, 29: 5000,
  31: 6000, 33: 7000, 35: 8000, 37: 9000, 39: 10000,
};

/** Candy cost by [loLevel, hiLevel] band, per variant family (below level 40). */
const CANDY_BANDS = {
  // Standard & Lucky share the same Candy cost (Lucky only halves Stardust).
  standard: [
    [1, 10.5, 1], [11, 20.5, 2], [21, 25.5, 3], [26, 30.5, 4],
    [31, 32.5, 6], [33, 34.5, 8], [35, 36.5, 10], [37, 38.5, 12], [39, 39.5, 15],
  ],
  shadow: [
    [8, 10.5, 2], [11, 20.5, 3], [21, 25.5, 4], [26, 30.5, 5],
    [31, 32.5, 8], [33, 34.5, 10], [35, 36.5, 12], [37, 38.5, 15], [39, 39.5, 18],
  ],
  purified: [
    [25, 25.5, 3], [26, 30.5, 4], [31, 32.5, 6], [33, 34.5, 8],
    [35, 36.5, 9], [37, 38.5, 11], [39, 39.5, 14],
  ],
} satisfies Record<string, [number, number, number][]>;

/** Standard XL band L41→50.5 — [level, stardust, xl]. Each row covers L and L.5
 *  (L50 also covers L50.5). */
const XL_BAND: [number, number, number][] = [
  [41, 10000, 10], [42, 11000, 10], [43, 11000, 12], [44, 12000, 12], [45, 12000, 15],
  [46, 13000, 15], [47, 13000, 17], [48, 14000, 17], [49, 14000, 20], [50, 15000, 20],
];

// ---------------------------------------------------------------------------
// Expansion to per-half-level rows
// ---------------------------------------------------------------------------

const stdDustAt = (level: number): number => {
  const start = Math.floor((level - 1) / 2) * 2 + 1; // 1,3,5,… for level 1..39.5
  return STD_DUST_TIERS[start];
};

const candyAt = (bands: [number, number, number][], level: number): number | undefined => {
  const band = bands.find(([lo, hi]) => level >= lo - 1e-9 && level <= hi + 1e-9);
  return band?.[2];
};

function buildSubForty(variant: Variant | "lucky", lo: number): PowerUpCost[] {
  const bands = variant === "shadow" ? CANDY_BANDS.shadow : variant === "purified" ? CANDY_BANDS.purified : CANDY_BANDS.standard;
  const dustScale = variant === "lucky" ? 0.5 : variant === "shadow" ? 1.2 : variant === "purified" ? 0.9 : 1;
  return HALF_LEVELS(lo, 39.5).map((level) => ({
    level,
    variant,
    stardust: Math.round(stdDustAt(level) * dustScale),
    candy: candyAt(bands, level),
  }));
}

/** Standard XL band expanded to half-levels (41, 41.5, … 50, 50.5). */
function buildXlBand(): PowerUpCost[] {
  const rows: PowerUpCost[] = [];
  for (const [level, stardust, xl] of XL_BAND) {
    rows.push({ level, variant: "standard", stardust, xl });
    rows.push({ level: level + 0.5, variant: "standard", stardust, xl });
  }
  return rows; // includes 50.5
}

/** Every readable power-up cost row, all variants. */
export const POWER_UP_COSTS: PowerUpCost[] = [
  ...buildSubForty("standard", 1),
  ...buildSubForty("lucky", 1),
  ...buildSubForty("shadow", 8),
  ...buildSubForty("purified", 25),
  ...buildXlBand(),
];
