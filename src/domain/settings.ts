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
   * Raid-lobby wait before the battle starts, in seconds (15–120). Play-style
   * dependent — a coordinated group starts in ~15s; a public lobby can run the
   * full ~2 min. `null` = auto: follow the lobby-size default (60s at a full 20,
   * else 120s). A manual value overrides that. The 15–25s of UI transitions are
   * added separately (see GAME_CONFIG.capacity.transitionSecRange).
   */
  lobbyWaitSec: number | null;
  /**
   * Which reward roll to plan around when sizing the schedule:
   * "optimistic" = best-case drops, "expected" = midpoint, "safe" = worst-case.
   */
  rewardCase: "optimistic" | "expected" | "safe";
  /** Free Raid Passes the user expects to get per day. */
  freeDailyPerDay: number;
  /** The user plans to use Remote Raid Passes. GO Fest 2026 lifts the daily
   *  remote limit, so the constraint is simply how many the user has / will use. */
  useRemoteRaids: boolean;
  /** How many Remote Raid Passes the user has and plans to use this event — the
   *  size of the remote-raid budget (replaces the old sleep-hours model). */
  remoteRaidPassesPlanned: number;
  /** Player location — decides which region-locked raids are local vs. remote-only. */
  region: UserRegion;
  /**
   * Raid passes the user already holds. Allocated to their goals in priority
   * order (highest first), so owned passes cover the most-important targets and
   * only the remainder needs buying. 0 = not provided. Doesn't change the plan,
   * just the have/need/buy split.
   */
  passesOwned: number;
  /** Link Charges the user already holds (spent on Mega / Super Mega raids). */
  linkChargesOwned: number;
  /** Rare Candy the user already holds (flexible — spend on any species). */
  rareCandyOwned: number;
  /** Rare Candy XL the user already holds. */
  rareCandyXlOwned: number;
  /** The user intends to use Link Charges on Mega / Super Mega raids — alters the
   *  PokéCoin pass cost (LC can stand in for an in-person Mega pass; remote Super
   *  Mega raids REQUIRE 200 LC on top of a Remote Pass). Off by default. */
  useLinkCharges: boolean;
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

export const DEFAULT_SETTINGS: PlannerSettings = {
  lobbySize: GAME_CONFIG.capacity.defaultLobbySize,
  partyPlay: false,
  partySize: 4,
  downtimeSecRange: { ...GAME_CONFIG.capacity.downtimeSecRange },
  lobbyWaitSec: null, // auto: follow the lobby-size default
  rewardCase: GAME_CONFIG.scheduler.rewardCase,
  freeDailyPerDay: GAME_CONFIG.passes.freeDailyPerDay,
  useRemoteRaids: false,
  remoteRaidPassesPlanned: 0,
  region: DEFAULT_REGION,
  passesOwned: 0,
  linkChargesOwned: 0,
  rareCandyOwned: 0,
  rareCandyXlOwned: 0,
  useLinkCharges: false,
  // L3 (Max) is the "standard" leveled mega — the realistic same-type buddy a
  // GO Fest raider runs, so the XL numbers reflect a +25% boost out of the box.
  megaBuddyLevel: 3,
  calibration: {},
};

/** The auto lobby-wait default for a lobby size: a full 20-trainer lobby fills/
 *  starts faster (60s), everything thinner waits longer (120s). */
export function defaultLobbyWaitSec(lobbySize: number): number {
  return lobbySize >= 20
    ? GAME_CONFIG.capacity.lobbyWaitSecFullLobby
    : GAME_CONFIG.capacity.lobbyWaitSecDefault;
}

/** The effective per-raid lobby wait: the user's override if set, else the
 *  lobby-size auto default, clamped to the allowed 15–120s range. */
export function effectiveLobbyWaitSec(s: PlannerSettings): number {
  const { min, max } = GAME_CONFIG.capacity.lobbyWaitSecRange;
  const raw = s.lobbyWaitSec ?? defaultLobbyWaitSec(s.lobbySize);
  return Math.max(min, Math.min(max, raw));
}

/** True when every planning knob is at its default (region is excluded). */
export function isDefaultSettings(s: PlannerSettings): boolean {
  return (
    s.lobbySize === DEFAULT_SETTINGS.lobbySize &&
    s.partyPlay === DEFAULT_SETTINGS.partyPlay &&
    s.partySize === DEFAULT_SETTINGS.partySize &&
    s.downtimeSecRange.min === DEFAULT_SETTINGS.downtimeSecRange.min &&
    s.downtimeSecRange.max === DEFAULT_SETTINGS.downtimeSecRange.max &&
    s.lobbyWaitSec === DEFAULT_SETTINGS.lobbyWaitSec &&
    s.rewardCase === DEFAULT_SETTINGS.rewardCase &&
    s.freeDailyPerDay === DEFAULT_SETTINGS.freeDailyPerDay &&
    s.remoteRaidPassesPlanned === DEFAULT_SETTINGS.remoteRaidPassesPlanned &&
    s.megaBuddyLevel === DEFAULT_SETTINGS.megaBuddyLevel &&
    s.passesOwned === DEFAULT_SETTINGS.passesOwned &&
    s.linkChargesOwned === DEFAULT_SETTINGS.linkChargesOwned &&
    s.useLinkCharges === DEFAULT_SETTINGS.useLinkCharges
  );
}
