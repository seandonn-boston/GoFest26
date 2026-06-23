import { GAME_CONFIG } from "@/data/config";
import { DEFAULT_REGION } from "@/data/locations";
import type { Range, UserRegion } from "./types";

/**
 * User-adjustable planning assumptions. These layer over GAME_CONFIG so a user
 * can tune the uncertain/personal numbers (how fast they raid, whether to plan
 * for best- or worst-case drops, how much they sleep) without touching code.
 * Exact per-raid reward *amounts* still live in the data layer.
 */
export interface PlannerSettings {
  /** Trainers in the raid lobby (red lobbies are full = 20). Drives battle time. */
  lobbySize: number;
  /** Party Play active — a 2–4 sub-group inside the lobby hits harder. */
  partyPlay: boolean;
  /** Party size 2–4, used when partyPlay is on. */
  partySize: number;
  /** Walking / setup time between raids. */
  downtimeSecRange: Range;
  /**
   * Which reward roll to plan around when sizing the schedule:
   * "optimistic" = best-case drops, "expected" = midpoint, "safe" = worst-case.
   */
  rewardCase: "optimistic" | "expected" | "safe";
  /** Free Raid Passes the user expects to get per day. */
  freeDailyPerDay: number;
  /** The user plans to use Remote Raid Passes. GO Fest 2026 lifts the daily remote
   *  limit, so these are unlimited in count — the only constraint is the time the
   *  user has for them (see `sleepHoursPerNight`). */
  useRemoteRaids: boolean;
  /**
   * Hours of sleep per night during the event. Remote raids happen in the user's
   * waking hours outside the in-person event window, so more sleep = less remote
   * raiding time. Default 8 (≈ midnight–8am).
   */
  sleepHoursPerNight: number;
  /** Player location — decides which region-locked raids are local vs. remote-only. */
  region: UserRegion;
  /**
   * Assumed Mega buddy level (0..4) for same-type catches, driving the XL-Candy
   * boost (see GAME_CONFIG.megaCatchBoost). 1 = base (no XL boost — the default,
   * so plans don't silently change); 3 = the "standard" leveled mega (+25%).
   * Per-boss `l4Buddy` overrides this to level 4 for type-eligible bosses.
   */
  megaBuddyLevel: number;
  /**
   * Observed per-raid yields the player has logged, as point estimates that
   * OVERRIDE the assumed reward ranges (tightening the plan to their real luck).
   * Empty = use the assumptions. Keyed by reward metric; absent = not calibrated.
   */
  calibration: Partial<Record<CalibrationMetric, number>>;
}

/** Reward metrics the player can calibrate to their own observed drops. */
export type CalibrationMetric = "superMegaEnergy" | "megaEnergy" | "legendaryXl" | "megaXl";

/** Below this nightly sleep, the planner warns it's ill-advised (the event is a
 *  full day of walking and sun). */
export const MIN_HEALTHY_SLEEP_HOURS = 7;
/** Default nightly sleep (≈ midnight–8am). */
export const DEFAULT_SLEEP_HOURS = 8;

export const DEFAULT_SETTINGS: PlannerSettings = {
  lobbySize: GAME_CONFIG.capacity.defaultLobbySize,
  partyPlay: false,
  partySize: 4,
  downtimeSecRange: { ...GAME_CONFIG.capacity.downtimeSecRange },
  rewardCase: GAME_CONFIG.scheduler.rewardCase,
  freeDailyPerDay: GAME_CONFIG.passes.freeDailyPerDay,
  useRemoteRaids: false,
  sleepHoursPerNight: DEFAULT_SLEEP_HOURS,
  region: DEFAULT_REGION,
  // L3 (Max) is the "standard" leveled mega — the realistic same-type buddy a
  // GO Fest raider runs, so the XL numbers reflect a +25% boost out of the box.
  megaBuddyLevel: 3,
  calibration: {},
};

/** True when every planning knob is at its default (region is excluded). */
export function isDefaultSettings(s: PlannerSettings): boolean {
  return (
    s.lobbySize === DEFAULT_SETTINGS.lobbySize &&
    s.partyPlay === DEFAULT_SETTINGS.partyPlay &&
    s.partySize === DEFAULT_SETTINGS.partySize &&
    s.downtimeSecRange.min === DEFAULT_SETTINGS.downtimeSecRange.min &&
    s.downtimeSecRange.max === DEFAULT_SETTINGS.downtimeSecRange.max &&
    s.rewardCase === DEFAULT_SETTINGS.rewardCase &&
    s.freeDailyPerDay === DEFAULT_SETTINGS.freeDailyPerDay &&
    s.sleepHoursPerNight === DEFAULT_SETTINGS.sleepHoursPerNight &&
    s.megaBuddyLevel === DEFAULT_SETTINGS.megaBuddyLevel
  );
}
