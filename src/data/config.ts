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
    // Lobby + battle time per raid (excludes the catch — that's modeled
    // separately so the "Quick catch" toggle can swap it out).
    raidDurationSec: 90,
    // Time to encounter, throw, and catch the boss. Quick-catching (throw then
    // immediately back out to skip the animation) is ~5s; a normal catch with
    // full animations averages ~100s.
    catchSec: { normal: 100, quick: 5 },
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

  // Mega Energy rewarded for *completing* (defeating) a raid, by tier. Awarded
  // on defeat regardless of whether you catch. source: standard Mega Raids
  // ~150–250 (2026 update); Super Mega Raids ~450.
  megaRewards: {
    mega: { min: 150, max: 250 } as Range,
    superMega: { min: 400, max: 450 } as Range,
  },

  // Rewards from *catching* the boss (skipped if you run from the encounter).
  // source: ~3 base candy, doubled to ~6 with a Pinap; transferring it = +1
  // candy. Legendary/Mythical catches are guaranteed 3 XL (+3 more for an
  // in-person Tier-5 completion); regular mega-raid catches give 0–3 XL.
  catch: {
    candy: { min: 3, max: 6 } as Range, // no berry → Pinap
    legendaryXl: { min: 3, max: 6 } as Range, // guaranteed 3 + in-person completion
    megaXl: { min: 1, max: 3 } as Range, // 0–3 in game; min 1 keeps worst-case finite
    transferCandy: 1,
    // A matching Mega-Evolved buddy adds +1 Candy per catch (and a modest XL
    // chance at higher mega levels, not modeled here).
    buddyBonusCandy: 1,
  },

  // Approximate cumulative Mega Energy to reach Mega Level 0..3 for a typical
  // (non-Mewtwo) Mega — covers the first evolution plus the level-ups. Real costs
  // vary per species; override a specific boss via its megaLevelEnergyTotals.
  genericMegaLevelTotals: [0, 200, 360, 560],

  // Free Raid Passes obtainable per day (spinning Gym Photo Discs during GO Fest).
  // source: up to 9 free Raid Passes per day. Remote Raids are capped at 20/day.
  passes: {
    freeDailyPerDay: 9,
    remotePerDay: 20,
  },

  scheduler: {
    // How per-boss raid demand is sized from the raids-needed range:
    // "optimistic" = best-case rolls (min), "expected" = midpoint, "safe" = worst-case (max).
    rewardCase: "expected" as "optimistic" | "expected" | "safe",
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;
