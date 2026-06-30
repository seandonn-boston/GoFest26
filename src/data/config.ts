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
    // Catch time (encounter + throw + catch). Quick-catching backs out of the
    // animation (~5s). source: confirmed — GO Fest 2026 boosts Premier Ball catch
    // odds significantly, so a normal catch lands in 1–2 balls; assume ~10s.
    catchSec: { normal: 10, quick: 5 },
    downtimeSecRange: { min: 20, max: 60 } as Range,
    // Per-raid overhead that is NOT battle and NOT catch: the lobby countdown
    // before the fight starts, plus the two UI transitions (lobby→battle, battle
    // →catch). The lobby wait is the big, play-style-dependent one (it can run
    // from ~15s when a coordinated group starts immediately up to the full ~2 min
    // public-lobby ceiling), so it's a user-editable assumption — defaulting to
    // 120s, or 60s once the lobby is a full 20 trainers (which fills/starts
    // faster). The transitions are quasi-fixed: lobby→battle is always ~5s, and
    // battle→catch is ~10–20s depending how fast the user taps through, giving a
    // 15–25s combined transition spread that feeds the fast/slow raid estimate.
    lobbyWaitSecRange: { min: 15, max: 120 } as Range,
    lobbyWaitSecDefault: 120,
    lobbyWaitSecFullLobby: 60,
    transitionSecRange: { min: 15, max: 25 } as Range,
    // Battle length depends on how full the lobby is. Time interpolates linearly
    // between the tier's minimum viable lobby (slow) and a full 20-trainer lobby
    // (fast), with a hard floor for the best achievable case. Mewtwo needs ≥10
    // trainers; other Megas can be duo'd (≥2); 5★ legendaries need ≥4.
    // fullSec values are calibrated to observed full-20-lobby, strong-counter,
    // no-party-play, boss-not-weather-boosted times: a regular Mega ~10–20s
    // (mid 15), a 5★ ~30–50s (mid 40), and a super-mega Mewtwo ~60–75s (mid 68).
    // The floors are the party-play best case — a full lobby cleared a super-mega
    // Skarmory in ~52s, the superMega floor here.
    battle: {
      superMega: { minRaiders: 10, fullSec: 68, minSec: 90, floorSec: 52 }, // Mega Mewtwo X/Y
      mega: { minRaiders: 2, fullSec: 15, minSec: 270, floorSec: 10 },
      fiveStar: { minRaiders: 4, fullSec: 40, minSec: 270, floorSec: 25 },
    },
    // Party Play — a sub-group of 2–4 *within* the lobby (a party is not a
    // lobby) — hits harder, shaving extra seconds by party size.
    partyShaveSec: { 2: 5, 3: 10, 4: 15 },
    // Default assumption: full "red" lobbies.
    defaultLobbySize: 20,
  },

  // XL Candy to power a Pokémon from level 40 → 50 (the 20 half-level steps).
  // Levels 40→50 are powered with XL Candy (+ Stardust); regular Candy is only
  // spent below level 40. source: CONFIRMED against the Pokémon GO Hub "Guide to
  // Power Up Costs" and "Candy XL Guide" — the standard 40→50 ladder sums to
  // exactly 296 XL. Shadow/Purified have no separate XL chart; they apply the
  // per-step variant multiplier (Shadow ×1.2, Purified ×0.9) rounding each step
  // up, giving 360 / 272. (Lucky shares the standard 296 — Lucky only halves
  // Stardust, never Candy or XL.)
  xlToLevel50: {
    standard: 296,
    shadow: 360,
    purified: 272,
  } satisfies Record<Variant, number>,

  // Regular Candy to raise a Pokémon from level 1 → 40 (Candy is only spent
  // below 40; XL takes over at 40). source: CONFIRMED — the Power Up Costs chart
  // sums to 304 Candy over levels 1→39.5, identical for every variant (Lucky
  // changes only Stardust). requirements.ts spreads this linearly across the
  // 39-level band when the current level is below 40, so it is exact at the
  // 1→40 endpoints and an approximation for partial sub-40 climbs.
  leveling: {
    candyToLevel40: 304,
  },

  // Stardust costs per single Pokémon, CONFIRMED against the same Pokémon GO Hub
  // charts. Not consumed by the planner today (the engine tracks Candy / XL /
  // Mega Energy), but recorded here as the source of truth for the level-up
  // economy and for any future Stardust modeling. Two bands:
  //   toLevel40   — sum of the 1→39.5 ladder
  //   level40to50 — sum of the 40→49.5 ladder (the XL band)
  // Standard & Lucky are read straight off the charts; Shadow = standard ×1.2
  // and Purified = standard ×0.9 (exact per-step multipliers). Note: Shadow
  // Pokémon only exist from level 8, so their full 1→40 figure is notional (the
  // as-caught level 8→40 chart sums to 316,320).
  stardust: {
    toLevel40: { standard: 270_000, lucky: 135_000, shadow: 324_000, purified: 243_000 },
    level40to50: { standard: 250_000, lucky: 125_000, shadow: 300_000, purified: 225_000 },
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
  // candy. Legendary/Mythical catches are guaranteed 3 XL; an in-person Tier-5
  // completion reliably adds the bonus (→ 5–6). Remote raids (the optional pool)
  // only see the 3-XL floor, but they're supplementary so we plan for in person.
  catch: {
    candy: { min: 3, max: 6 } as Range, // no berry → Pinap
    legendaryXl: { min: 5, max: 6 } as Range, // in-person Tier-5: guaranteed 3 + completion bonus
    megaXl: { min: 1, max: 3 } as Range, // 0–3 in game; min 1 keeps worst-case finite
    transferCandy: 1,
    // A matching Mega-Evolved buddy adds +1 Candy per catch (and a modest XL
    // chance at higher mega levels, not modeled here).
    buddyBonusCandy: 1,
  },

  // Same-type Mega buddy XL-Candy boost. An active Mega / Primal Evolution that
  // SHARES A TYPE with the Pokémon you catch raises the chance of Candy XL per
  // roll, scaling with the buddy's Mega Level. We model it as a proportional
  // multiplier on the assumed catch-XL range (a logged calibration value already
  // reflects the player's own mega, so it is NOT boosted again).
  //   xlByLevel indexed by Mega Level 0..4 (flat % increase per roll):
  //     L0/L1 (Base, 1 evo) none · L2 (High, 7 evo) +10% ·
  //     L3 (Max, 30 evo, "standard") +25% · L4 (Super Max) +30%.
  //   l4Types — the typings of the five Mega Level 4 species available in 2026;
  //     a boss can use the +30% boost only if its typing includes one of these.
  // source: community-reported boost tiers; Mega Level 4 is 2026-only. Editable.
  megaCatchBoost: {
    xlByLevel: [0, 0, 0.1, 0.25, 0.3],
    l4Types: ["Fighting", "Psychic", "Grass", "Poison", "Dark", "Flying", "Dragon", "Steel"],
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

  // PokéCoin economics for "how much would the passes cost?" — every price here
  // is a one-line edit. Singles are intentionally excluded (no one buys the
  // single green/remote pass); only the 3-pack or a bulk box is modeled.
  // source: in-game shop, June 2026 (screenshot-confirmed).
  passEconomy: {
    // Free Orange (daily) passes from spinning Gyms — applied first, for free.
    freePassesPerWeekendDay: 9,
    freePassesPerRoadDay: 3,
    // Premium Battle Pass ("green", in-person). 3-pack = 250 (≈83⅓/pass). A
    // limited-time box can carry ~99 passes for ~5,000 coins (≈50/pass).
    green: { bundlePasses: 3, bundleCoins: 250, bestBoxCoinsPerPass: 50 },
    // Remote Raid Pass ("blue"). 3-pack = 525 (175/pass). Carry limit 3, so no
    // big packs — boxes rarely beat the 3-pack, so the low rate matches it.
    remote: { bundlePasses: 3, bundleCoins: 525, bestBoxCoinsPerPass: 175 },
    // Link Charges — usable only on Mega (150 LC) or Super Mega (200 LC) raids.
    // In person they can stand in for a Mega/Super-Mega pass; a REMOTE Super Mega
    // Raid needs a Remote Pass AND 200 LC (LC alone can't remote a Mega raid).
    // Packs (best per-LC first): 600 LC = 250 coins, 200 LC = 100 coins.
    linkCharge: {
      perMegaRaid: 150,
      perSuperMegaRaid: 200,
      packs: [
        { lc: 600, coins: 250 },
        { lc: 200, coins: 100 },
      ],
    },
  },

  // Dynamax / Gigantamax "Max Move" training costs — Candy + XL Candy ONLY (the
  // Max Particle cost isn't a raid resource, so it's deliberately out of the
  // raid plan). Every Pokémon's three Max Moves level on the same cumulative
  // schedule, read off the in-game training screen (Charmander, confirmed):
  //   Lv1: 50 Candy · Lv2: 150 Candy · Lv3 (MAX): 150 Candy + 40 XL.
  // Dynamax and Gigantamax share this schedule. Max Attack comes unlocked at
  // Lv1, so maxing it spends only Lv1→3 (100 Candy + 40 XL); Max Guard and Max
  // Spirit start locked at Lv0 and spend the full 0→3 (150 Candy + 40 XL each).
  // One "max its Dynamax moves" toggle covers all three: 400 Candy + 120 XL.
  maxMoves: {
    /** A move that starts LOCKED (Max Guard, Max Spirit): full Lv0→3. */
    lockedMoveToMax: { candy: 150, xlCandy: 40 } as { candy: number; xlCandy: number },
    /** Max Attack starts unlocked at Lv1, so only Lv1→3. */
    attackToMax: { candy: 100, xlCandy: 40 } as { candy: number; xlCandy: number },
  },

  scheduler: {
    // How per-boss raid demand is sized from the raids-needed range:
    // "optimistic" = best-case rolls (min), "expected" = midpoint, "safe" = worst-case (max).
    rewardCase: "expected" as "optimistic" | "expected" | "safe",
  },
} as const;

export type GameConfig = typeof GAME_CONFIG;
