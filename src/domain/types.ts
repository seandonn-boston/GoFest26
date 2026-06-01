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

/** Reward amounts a single completed raid yields. */
export interface RewardProfile {
  candy: Range;
  xlCandy: Range;
  /** Only present for mega / super-mega tiers. */
  megaEnergy?: Range;
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
  /** Optional planning tip (e.g. "wait for the Primal form to get Primal Energy"). */
  note?: string;
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

/** Per-boss user input. */
export interface BossInput {
  bossId: string;
  selected: boolean;
  /** How many of each variant the user wants to take to the target level. */
  counts: Record<Variant, number>;
  /** Optional extra XL Candy to bank beyond maxing the counted Pokémon. */
  extraXl?: number;
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
  /** Run from the encounter (raid-completion rewards only, no catch candy/XL). */
  skipCatch?: boolean;
  /** Assume a matching Mega-Evolved buddy is active for the same-type candy bonus. */
  megaBuddy?: boolean;
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
  raidDurationSec: number;
  /** Catch time per raid (5s when quick-catching, ~100s otherwise). */
  catchSec: number;
  downtimeSecRange: Range;
  raidsPerHour: Range;
  totalRaids: Range;
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
  /** Fraction of weekend capacity consumed, using midpoints. */
  utilization: number;
  /** Whether the worst-case plan fits within weekend capacity. */
  feasible: boolean;
}
