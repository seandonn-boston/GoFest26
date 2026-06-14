import { GAME_CONFIG } from "@/data/config";
import { DEFAULT_REGION } from "@/data/locations";
import type { Range, UserRegion } from "./types";

/**
 * User-adjustable planning assumptions. These layer over GAME_CONFIG so a user
 * can tune the uncertain/personal numbers (how fast they raid, whether to plan
 * for best- or worst-case drops, how many free passes they'll get) without
 * touching code. Exact per-raid reward *amounts* still live in the data layer.
 */
export interface PlannerSettings {
  /** Trainers in the raid lobby (red lobbies are full = 20). Drives battle time. */
  lobbySize: number;
  /** Party Play active — a 2–4 sub-group inside the lobby hits harder. */
  partyPlay: boolean;
  /** Party size 2–4, used when partyPlay is on. */
  partySize: number;
  /** Quick-catch (throw + back out to skip the animation): ~5s catch vs. ~100s. */
  quickCatch: boolean;
  /** Walking / setup time between raids. */
  downtimeSecRange: Range;
  /**
   * Which reward roll to plan around when sizing the schedule:
   * "optimistic" = best-case drops, "expected" = midpoint, "safe" = worst-case.
   */
  rewardCase: "optimistic" | "expected" | "safe";
  /** Free Raid Passes the user expects to get per day. */
  freeDailyPerDay: number;
  /** Max Remote Raids per day (for out-of-region, remote-only bosses). */
  remotePassesPerDay: number;
  /** The user plans to use Remote Raid Passes (a pool of extra, non-time-blocked raids). */
  useRemoteRaids: boolean;
  /** How many Remote Raid Passes the user plans to spend in total (the pool size). */
  remoteRaidBudget: number;
  /** Player location — decides which region-locked raids are local vs. remote-only. */
  region: UserRegion;
}

/** Hard cap on planned remote raids: Sat & Sun 40 + Fri 10 + Mon 10 (timezone). */
export const MAX_REMOTE_RAIDS = 60;

/** Remote raids reliably available Saturday + Sunday. Beyond this the user is
 *  relying on Friday/Monday timezone raids (capped 10 each, adjacent day only) —
 *  high-risk, shown red. */
export const SAFE_REMOTE_RAIDS = 40;

/** Upper bound the user can set their remote-raid budget to (the 60-raid cap). */
export const MAX_REMOTE_BUDGET = MAX_REMOTE_RAIDS;

/** Per-species remote cap — one day's bosses fit ~50 remotes; Mewtwo (both days) the full 60. */
export const MAX_REMOTE_PER_SPECIES = 50;

export const DEFAULT_SETTINGS: PlannerSettings = {
  lobbySize: GAME_CONFIG.capacity.defaultLobbySize,
  partyPlay: false,
  partySize: 4,
  quickCatch: false,
  downtimeSecRange: { ...GAME_CONFIG.capacity.downtimeSecRange },
  rewardCase: GAME_CONFIG.scheduler.rewardCase,
  freeDailyPerDay: GAME_CONFIG.passes.freeDailyPerDay,
  remotePassesPerDay: GAME_CONFIG.passes.remotePerDay,
  useRemoteRaids: false,
  remoteRaidBudget: SAFE_REMOTE_RAIDS,
  region: DEFAULT_REGION,
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
    s.quickCatch === DEFAULT_SETTINGS.quickCatch &&
    s.freeDailyPerDay === DEFAULT_SETTINGS.freeDailyPerDay &&
    s.remotePassesPerDay === DEFAULT_SETTINGS.remotePassesPerDay &&
    s.remoteRaidBudget === DEFAULT_SETTINGS.remoteRaidBudget
  );
}

