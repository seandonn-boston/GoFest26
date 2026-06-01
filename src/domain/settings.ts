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
  /** Try-hard option: also do a day of Remote Raids the Friday night before. */
  fridayRemoteRaids: boolean;
  /** Player location — decides which region-locked raids are local vs. remote-only. */
  region: UserRegion;
}

export const DEFAULT_SETTINGS: PlannerSettings = {
  lobbySize: GAME_CONFIG.capacity.defaultLobbySize,
  partyPlay: false,
  partySize: 4,
  quickCatch: false,
  downtimeSecRange: { ...GAME_CONFIG.capacity.downtimeSecRange },
  rewardCase: GAME_CONFIG.scheduler.rewardCase,
  freeDailyPerDay: GAME_CONFIG.passes.freeDailyPerDay,
  remotePassesPerDay: GAME_CONFIG.passes.remotePerDay,
  fridayRemoteRaids: false,
  region: DEFAULT_REGION,
};
