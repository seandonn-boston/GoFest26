import { GAME_CONFIG } from "@/data/config";
import { clamp } from "@/lib/math";
import { DEFAULT_SETTINGS, effectiveLobbyWaitSec, type PlannerSettings } from "./settings";
import type { CapacityModel } from "./types";

type TierKey = "superMega" | "mega" | "fiveStar";
const TIER_KEYS: TierKey[] = ["superMega", "mega", "fiveStar"];

/**
 * Battle seconds for one tier given the lobby size and Party Play. Time
 * interpolates linearly from the tier's minimum viable lobby (slow) to a full
 * 20-trainer lobby (fast), then Party Play shaves a few seconds, floored at the
 * best achievable case.
 */
export function tierBattleSeconds(tier: TierKey, settings: PlannerSettings): number {
  const cfg = GAME_CONFIG.capacity.battle[tier];
  const lobby = clamp(settings.lobbySize ?? 20, cfg.minRaiders, 20);
  const span = 20 - cfg.minRaiders;
  const frac = span > 0 ? (lobby - cfg.minRaiders) / span : 0; // 0 at min, 1 at 20 (guard /0)
  let sec = cfg.minSec + (cfg.fullSec - cfg.minSec) * frac;

  if (settings.partyPlay) {
    const shave = (GAME_CONFIG.capacity.partyShaveSec as Record<number, number>)[settings.partySize ?? 4] ?? 0;
    sec -= shave;
  }

  return Math.max(cfg.floorSec, Math.round(sec));
}

/**
 * Models the maximum number of raids a power-user can realistically complete
 * across the weekend, from battle time (lobby-size + party dependent), catch
 * time, and between-raid downtime.
 */
export function computeCapacity(settings: PlannerSettings = DEFAULT_SETTINGS): CapacityModel {
  const { hoursPerDay, days } = GAME_CONFIG.event;
  const { downtimeSecRange } = settings;
  const lobbySize = settings.lobbySize ?? DEFAULT_SETTINGS.lobbySize;

  // Battle time spans the tiers: fastest (e.g. a Mega in a full lobby) to
  // slowest (e.g. Mewtwo, or any boss in a thin lobby).
  const battles = TIER_KEYS.map((t) => tierBattleSeconds(t, settings));
  const battleSecRange = { min: Math.min(...battles), max: Math.max(...battles) };

  // Baseline assumes a full (normal) catch — the realistic ceiling when you're
  // catching for Candy. Quick-catch is now an opt-in per species per time block
  // (it trades that catch Candy/XL for speed) and is modelled in the block plan.
  const catchSec = GAME_CONFIG.capacity.catchSec.normal;

  // Per-raid overhead that is neither battle nor catch: the lobby wait (user-
  // adjustable, auto-defaulted by lobby size) plus the 15–25s of UI transitions
  // (lobby→battle + battle→catch). Added to every raid regardless of tier.
  const lobbySec = Math.round(effectiveLobbyWaitSec(settings));
  const transitionSecRange = GAME_CONFIG.capacity.transitionSecRange;

  // Best case = fastest battle + least overhead/downtime; worst case = the most.
  const perRaidFast = lobbySec + transitionSecRange.min + battleSecRange.min + catchSec + downtimeSecRange.min;
  const perRaidSlow = lobbySec + transitionSecRange.max + battleSecRange.max + catchSec + downtimeSecRange.max;

  const raidsPerHour = {
    min: Math.floor(3600 / perRaidSlow),
    max: Math.floor(3600 / perRaidFast),
  };

  const totalRaids = {
    min: raidsPerHour.min * hoursPerDay * days,
    max: raidsPerHour.max * hoursPerDay * days,
  };

  // How much faster a quick-catch raid is than a normal one (battle + downtime
  // are shared; only the catch differs). A quick raid "costs" this fraction of a
  // normal raid-slot, so a block set to quick-catch fits proportionally more.
  const battleMid = (battleSecRange.min + battleSecRange.max) / 2;
  const downtimeMid = (downtimeSecRange.min + downtimeSecRange.max) / 2;
  // Overhead (lobby + transitions) is shared by normal and quick raids alike.
  const overheadMid = lobbySec + (transitionSecRange.min + transitionSecRange.max) / 2;
  const normalMid = overheadMid + battleMid + GAME_CONFIG.capacity.catchSec.normal + downtimeMid;
  const quickMid = overheadMid + battleMid + GAME_CONFIG.capacity.catchSec.quick + downtimeMid;
  const quickCatchSlotFactor = normalMid > 0 ? quickMid / normalMid : 1;

  // Remote raids (GO Fest 2026 lifts the daily limit) are unlimited in count;
  // the constraint is simply how many Remote Raid Passes the user has / plans to
  // use — entered directly, so the remote budget is that flat count.
  const remotePlanned = Math.max(0, Math.round(settings.remoteRaidPassesPlanned ?? 0));
  const remoteCapacity = { min: remotePlanned, max: remotePlanned };

  return {
    hoursPerDay,
    days,
    lobbySize,
    battleSecRange,
    catchSec,
    lobbySec,
    transitionSecRange,
    downtimeSecRange,
    raidsPerHour,
    totalRaids,
    quickCatchSlotFactor,
    // Kept for the CapacityModel shape; no longer time-derived.
    remoteHoursPerDay: 0,
    remoteHours: 0,
    remoteCapacity,
  };
}
