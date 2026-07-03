// Shared domain types for the GO Fest 2026 Raid Planner.
// This module is intentionally free of React and browser APIs so the
// calculation engine can be unit-tested in isolation.

export type RaidTier = "super-mega" | "mega" | "five-star" | "regional";

export type Currency = "candy" | "xlCandy" | "megaEnergy";

export type Variant = "standard" | "shadow" | "purified";

export type EventDay = "sat" | "sun";

/** Continental region groupings used by Niantic for region-locked raids. */
export type Continent = "americas" | "emea" | "apac";

/**
 * A geographic restriction on a raid boss. Only the specified axes are
 * constrained; an undefined axis means "anywhere". A boss with no scope at all
 * is globally available.
 *   - ns: Northern / Southern hemisphere
 *   - ew: Eastern / Western hemisphere
 *   - continent: Americas+Greenland / Europe-MEA-India / Asia-Pacific
 */
export interface RegionScope {
  ns?: "N" | "S";
  ew?: "E" | "W";
  continent?: Continent;
}

/** The player's location, used to decide which raids are local vs. remote-only. */
export interface UserRegion {
  label: string;
  ns: "N" | "S";
  ew: "E" | "W";
  continent: Continent;
}

/** A min/max range. Rewards are modeled as ranges because in-game drops vary. */
export interface Range {
  min: number;
  max: number;
}

/**
 * How a single target claims its slice of a raid window (a weekend habitat block
 * or a Road-of-Legends day). Absent → `priority` (the default): targets fill the
 * window top-to-bottom in drag order, each taking its full need before the next.
 *  - `fixed`:   an exact raid count reserved off the top (e.g. "10 Mewtwo").
 *  - `goal`:    a percentage of THIS target's own required raids, reserved off the
 *    top (e.g. "80% of its 50-raid goal" → 40 raids here, the rest elsewhere).
 *  - `floor`:   a guaranteed minimum (≥ N) reserved off the top; the target then
 *    keeps competing (like priority) for more time beyond its floor.
 *  - `ceiling`: a maximum (≤ N) — fills like priority but never exceeds N, so the
 *    rest of its need spills to other windows.
 *  - `share`:   a relative weight — share targets split the TIME left after the
 *    reservations, in proportion to their weights (50/40/10 or the equal-weight
 *    "even" split), each capped at its real need, leftover reflowing to the others.
 * Reservations (fixed + goal + floor minimums) come first in drag order, then
 * shares split what's left, then priority/floor/ceiling targets soak up any
 * remaining time in drag order — so they mix freely and an unpinned target always
 * absorbs the slack (the window can't seize up). Time is measured in slots, so a
 * "share" is a share of TIME.
 */
export type AllocationMode = "priority" | "share" | "fixed" | "goal" | "floor" | "ceiling";
export interface BlockAllocation {
  mode: AllocationMode;
  /** Relative weight when `mode === "share"` (any positive number; normalized). */
  weight?: number;
  /** Raid count for `fixed` (exact), `floor` (minimum), or `ceiling` (maximum). */
  count?: number;
  /** Percent of this target's own required raids when `mode === "goal"` (0–100). */
  percent?: number;
}

/** Reward amounts a single completed raid yields. */
export interface RewardProfile {
  candy: Range;
  xlCandy: Range;
  /** Only present for mega / super-mega tiers. */
  megaEnergy?: Range;
}

/** Family of "build a special forme" energy earned from raids, separate from
 *  Mega Energy: Fusion (Kyurem/Necrozma), Crowned (Zacian/Zamazenta), and
 *  Primal (Groudon/Kyogre). */
export type EnergyKind = "fusion" | "primal" | "crowned";

/**
 * A fusion / crowned / primal energy a base-form boss can work toward by raiding
 * its special forme (e.g. raid White Kyurem to bank Blaze Fusion Energy toward
 * White Kyurem). These raids appear during Road of Legends week, not the GO Fest
 * weekend, so this is a standalone goal — not folded into the weekend raid count.
 */
export interface EnergyGoalDef {
  /** Stable key within the boss; matches the OCR flavor where one exists. */
  key: string;
  kind: EnergyKind;
  /** Short label, e.g. "Blaze · White Kyurem". */
  label: string;
  /** OCR flavor used to tether screenshot scans (volt/blaze/solar/lunar/sword/shield/primal). */
  flavor: string;
  /** Energy required to fuse / revert once. */
  cost: number;
  /** Energy rewarded per completed source raid (varies by speed + damage dealt). */
  perRaid: Range;
  /** The raid that drops it, e.g. "White Kyurem". */
  source: string;
  /** Short forme label for the card pre-title, e.g. "White", "Dawn Wings", "Crowned". */
  forme?: string;
  /** Extra type(s) the fused forme brings to the base species' card styling +
   *  type-icon row (beyond the base types). Necrozma's Dawn Wings/Dusk Mane add
   *  Ghost/Steel (its Lunala/Solgaleo fusions); Kyurem's White/Black surface
   *  Fire/Electric — the Reshiram/Zekrom fusion energies (GO lists both formes as
   *  Dragon/Ice, so these are thematic, for the card's look). */
  addedTypes?: string[];
  /** PokeMiners sprite filename of the SOURCE forme (White Kyurem, Primal Groudon,
   *  …) — distinct from the base Pokémon's icon. */
  sprite?: string;
  /** Road of Legends day id the source raid is featured (mon..fri). */
  roadDayId?: string;
  /** Extra context (e.g. the cheaper repeat-revert cost for Primals). */
  note?: string;
}

/** The user's progress toward one energy goal: energy on hand, the target
 *  (defaults to the fuse/revert cost), and whether they're pursuing it. */
export interface EnergyProgress {
  have: number;
  goal: number;
  on: boolean;
}

/**
 * A window during which a windowed boss is available.
 * Hours are event-local hour indexes 0..8 (10am = 0 ... 6pm = 8), per day.
 */
export interface HabitatWindow {
  day: EventDay;
  /** inclusive, 0..8 */
  startHour: number;
  /** exclusive, 1..9 */
  endHour: number;
}

export interface RaidBoss {
  id: string;
  name: string;
  /** Base species name, shared across formes — "Zacian (Hero of Many Battles)" and
   *  Crowned Zacian both → "Zacian", "Mega Tyranitar" → "Tyranitar", Lunala stays
   *  "Lunala" (the species itself, not its Cosmog pre-evolution). Always populated
   *  on roster bosses (derived in RAID_BOSSES). */
  species?: string;
  tier: RaidTier;
  /** Lower sorts first; Mega Mewtwo X/Y are pinned to the top. */
  sortPriority: number;
  /** True => available every hour of both days (e.g. Mega Mewtwo). */
  allWeekend: boolean;
  /** Availability windows; ignored when allWeekend is true. */
  windows: HabitatWindow[];
  rewards: RewardProfile;
  /** Which currency inputs to render for this boss (5★ raids have no mega energy). */
  rewardsCurrencies: Currency[];
  bestCounters: string[];
  /** Pokémon types (e.g. ["Psychic", "Fighting"]); used for buddy-boost matching. */
  types?: string[];
  /** Pokémon GO sprite image URL. */
  sprite?: string;
  /** Geographic restriction; undefined = globally available. */
  region?: RegionScope;
  /** Home region where the boss appears far MORE FREQUENTLY (a spawn-rate boost,
   *  not a lock — it stays raidable everywhere; lake trio). Drives the remote
   *  section's "worth remote-raiding from its home region" listing. */
  boostRegion?: RegionScope;
  /** Optional planning tip (e.g. "wait for the Primal form to get Primal Energy"). */
  note?: string;
  // ---- Multi-form (shared-resource) species ----
  /** Group id when this boss is one forme of a shared-Candy species (Giratina,
   *  Dialga, Palkia, the genie quartet). Siblings share one resource pool. */
  formGroup?: string;
  /** Short forme label for the combined card ("Altered", "Origin", "Therian"…). */
  formLabel?: string;
  /** True for the group's representative forme that carries the shared pool. */
  formPrimary?: boolean;
  // ---- Mega-specific fields (only for mega / super-mega bosses) ----
  /** Mega Energy cost of the very first Mega Evolution (e.g. 7,500 for Mewtwo). */
  megaEvolutionEnergyFirst?: number;
  /**
   * Cumulative Mega Energy required to *reach* each Mega Level, indexed by
   * mega level 0..4. Index 0 is always 0 (already at level 0). The first
   * evolution cost is tracked separately via megaEvolutionEnergyFirst.
   */
  megaLevelEnergyTotals?: number[];
  /** GO Fest-caught specimens come pre-unlocked with >= 1 mega level. */
  goFestPreUnlocked?: boolean;
}

/**
 * One specific individual the user wants to max — its own current level, mega
 * level, variant and target. Multiple copies of a species are planned together
 * and draw from ONE shared on-hand pool (BossInput.current.{candy,xlCandy,
 * megaEnergy}), allocated to the highest-priority copy first.
 */
export interface PokemonCopy {
  /** Stable id for priority ordering / React keys. */
  id: string;
  variant: Variant;
  /** Lucky halves Stardust cost (informational — Stardust isn't a raid cost). */
  lucky?: boolean;
  /** Account for the Candy + XL Candy to fully max this individual's three Max
   *  Moves (Dynamax/Gigantamax). Max Attack starts unlocked at Lv1, Max Guard
   *  and Max Spirit start locked — see GAME_CONFIG.maxMoves for the cost. */
  maxMoves?: boolean;
  /** `megaLevel` is the sole mega for normal bosses; for Mewtwo it's the X
   *  branch and `megaLevelY` the (independent) Y branch — a caught Mewtwo has at
   *  most one branch pre-unlocked, so the other starts at 0. */
  current: { level: number; megaLevel: number; megaLevelY?: number };
  target: { level: number; megaLevel: number; megaLevelY?: number };
}

/** Per-boss user input. */
export interface BossInput {
  bossId: string;
  selected: boolean;
  /** How many of each variant the user wants to take to the target level. */
  counts: Record<Variant, number>;
  /**
   * How many of this species the user wants to take to the goal. Every gross
   * requirement (candy, XL, mega/primal energy, stardust, …) scales with this,
   * so maxing two Mewtwo costs twice the resources. Defaults to 1.
   */
  quantity?: number;
  current: {
    candy: number;
    xlCandy: number;
    megaEnergy: number;
    /** Current Pokémon level (e.g. 40). */
    level: number;
    /** Current Mega Level 0..4. */
    megaLevel: number;
  };
  presetId?: string;
  target: {
    level: number;
    megaLevel: number;
  };
  /** Variant of the single default copy (when `copies` is empty). Affects the
   *  XL-to-50 total (regular 296 / shadow 360 / purified 272). */
  variant?: Variant;
  /** Distinct individuals to max, in PRIORITY order (highest first). When
   *  non-empty this supersedes the single current/target/quantity for the
   *  leveling + mega requirement; current.{candy,xlCandy,megaEnergy} stay the
   *  shared on-hand pool, allocated to the highest-priority copy first. */
  copies?: PokemonCopy[];
  /** Assume a matching Mega-Evolved buddy is active for the same-type candy bonus. */
  megaBuddy?: boolean;
  /** Catch this boss with a Level-4 (Super Max) same-type Mega active for the
   *  top XL-Candy boost. Only meaningful for bosses whose typing matches a
   *  Level-4 Mega (see GAME_CONFIG.megaCatchBoost.l4Types). */
  l4Buddy?: boolean;
  /** Fusion/crowned/primal energy worked toward, keyed by EnergyGoalDef.key.
   *  Standalone from the maxing plan (earned in Road of Legends week). */
  energy?: Record<string, EnergyProgress>;
}

export interface CurrencyNeed {
  /** target - current, clamped to >= 0. */
  needed: number;
  /** Raids required to cover this currency alone. */
  raidsRange: Range;
}

export interface BossResult {
  bossId: string;
  needs: Partial<Record<Currency, CurrencyNeed>>;
  /** Raids needed for this boss given its inputs/toggles (binding currency). */
  raids: Range;
  /** The currency that demands the most raids (the constraint). */
  bindingCurrency: Currency | null;
}

export interface CapacityModel {
  hoursPerDay: number;
  days: number;
  /** Trainers assumed in the lobby (drives battle time). */
  lobbySize: number;
  /** Battle seconds spread across tiers given the lobby/party settings. */
  battleSecRange: Range;
  /** Catch time per raid for the normal (Candy-earning) catch baseline (~100s). */
  catchSec: number;
  /** Raid-lobby wait before the battle starts (user-adjustable assumption). */
  lobbySec: number;
  /** UI transitions per raid: lobby→battle (~5s) + battle→catch (~10–20s),
   *  a 15–25s spread that widens the fast/slow raid estimate. */
  transitionSecRange: Range;
  downtimeSecRange: Range;
  raidsPerHour: Range;
  totalRaids: Range;
  /** A quick-catch raid's time as a fraction of a normal raid's (≈0.5): used to
   *  fit more raids in a block when a species' block is set to quick-catch. */
  quickCatchSlotFactor: number;
  /** Waking hours per day available for remote raids (24 − sleep − event window). */
  remoteHoursPerDay: number;
  /** Total remote-raid hours across the event days. */
  remoteHours: number;
  /** Raids that fit in the remote-raid hours (count). GO Fest 2026 lifts the
   *  remote pass limit, so this is a TIME ceiling, not a hard pass cap. */
  remoteCapacity: Range;
}

// orange = free Premium/Orange pass (limited), green = free Green pass / Link
// Charge (unlimited), remote = Remote Raid Pass (capped per day).
export type PassType = "orange" | "green" | "remote";

/** A single raid placed at a specific time in the weekend plan. */
export interface ScheduledRaid {
  day: EventDay;
  /** event-local hour index 0..8 */
  hour: number;
  slotInHour: number;
  bossId: string;
  bossName: string;
  tier: RaidTier;
  /** Mega the user should have evolved as buddy for a Candy/XL boost, if any. */
  recommendedBuddyMegaId?: string;
  recommendedBuddyMegaName?: string;
  passType: PassType;
  counters: string[];
  /** Named habitat hour-block this raid falls in (e.g. "Stormfire Peaks"). */
  habitat?: string;
  /** True when this boss is not available in the player's region (remote raid). */
  remote: boolean;
  /** Human-readable region restriction, if any. */
  regionLabel?: string;
}

export interface UnmetGoal {
  bossId: string;
  bossName: string;
  currency: Currency | null;
  /** Raids that couldn't be placed within the boss's available windows. */
  shortfall: number;
}

export interface Schedule {
  raids: ScheduledRaid[];
  /** True when every selected boss's demand fit within its available windows. */
  feasible: boolean;
  unmetGoals: UnmetGoal[];
  /** Raids-per-hour planning value used to size the slot grid. */
  planningRaidsPerHour: number;
}

export interface PlanSummary {
  results: BossResult[];
  capacity: CapacityModel;
  schedule: Schedule;
  /** Total raids across all selected bosses. */
  totalRaids: Range;
  /** Opted-in remote-raid passes — extra capacity on top of the weekend's in-person raids. */
  remotePool: number;
  /** Fraction of capacity (in-person + remote) consumed, using midpoints. */
  utilization: number;
  /** Whether the worst-case plan fits within capacity (in-person + remote). */
  feasible: boolean;
}
