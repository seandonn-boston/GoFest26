import type { Range, Variant } from "@/domain/types";

/**
 * GAME_CONFIG — the single source of truth for every tunable game number.
 *
 * Every value here is an estimate based on publicly available GO Fest 2026
 * information and known Pokémon GO mechanics. Numbers are flagged with a
 * `source` note where they are confirmed vs. still estimated, so they can be
 * corrected with a one-line edit when Niantic publishes final values.
 */
export const GAME_CONFIG = {
  event: {
    name: "Pokémon GO Fest 2026: Global",
    dateLabel: "July 11–12, 2026",
    // source: confirmed — 10am–7pm local, both days = 9 hrs/day.
    hoursPerDay: 9,
    days: 2,
    hourStartLocal: 10,
  },

  capacity: {
    // A full-lobby raid: ~2 min lobby+battle+catch, plus walking/setup between.
    raidDurationSec: 120,
    downtimeSecRange: { min: 20, max: 60 } as Range,
  },

  // XL Candy required to power a Pokémon from level 40 to level 50.
  // Levels 40→50 are powered with XL Candy (+ Stardust); regular Candy is only
  // spent below level 40. source: confirmed community values.
  xlToLevel50: {
    standard: 296,
    shadow: 360,
    purified: 272,
  } satisfies Record<Variant, number>,

  // Coarse estimate of regular Candy to raise a Pokémon from level 1 to 40.
  // Used to estimate regular-candy need only when the current level is below 40.
  // This is an approximation and rarely the binding currency for a level-50 goal.
  leveling: {
    candyToLevel40: 270,
  },

  // Mega Energy rewarded per raid by tier.
  // source: standard Mega Raids ~150–250 (2026 update); Super Mega Raids ~450.
  megaRewards: {
    mega: { min: 150, max: 250 } as Range,
    superMega: { min: 400, max: 450 } as Range,
  },

  // Default candy / XL candy rewards for non-mega legendary (5★) raids.
  // source: legendaries give base candy + a guaranteed 3 XL on catch.
  legendaryRewards: {
    candy: { min: 10, max: 14 } as Range,
    xlCandy: { min: 2, max: 4 } as Range,
  },

  // Approximate cumulative Mega Energy to reach Mega Level 0..3 for a typical
  // (non-Mewtwo) Mega — covers the first evolution plus the level-ups. Real costs
  // vary per species; override a specific boss via its megaLevelEnergyTotals.
  genericMegaLevelTotals: [0, 200, 360, 560],

  // Mega-buddy boost multipliers applied to candy/XL gained from raids.
  // source: a level-1 mega boosts regular candy only; High/Max/Super-Max
  // mega level additionally boosts XL candy. Mega Energy is never boosted.
  buddyBoost: {
    candyMultiplier: 2,
    xlMultiplier: 2,
    appliesToMegaEnergy: false,
  },

  // Free Raid Passes obtainable per day (spinning Gym Photo Discs during GO Fest).
  // source: up to 9 free Raid Passes per day.
  passes: {
    freeDailyPerDay: 9,
  },

  scheduler: {
    // How per-boss raid demand is sized from the raids-needed range:
    // "optimistic" = best-case rolls (min), "expected" = midpoint, "safe" = worst-case (max).
    rewardCase: "expected" as "optimistic" | "expected" | "safe",
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;
