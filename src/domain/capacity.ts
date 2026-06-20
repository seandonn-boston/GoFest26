import { GAME_CONFIG } from "@/data/config";
import { clamp } from "@/lib/math";
import { DEFAULT_SETTINGS, type PlannerSettings } from "./settings";
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

  // Best case = fastest battle + least downtime; worst case = slowest + most.
  const perRaidFast = battleSecRange.min + catchSec + downtimeSecRange.min;
  const perRaidSlow = battleSecRange.max + catchSec + downtimeSecRange.max;

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
  const normalMid = battleMid + GAME_CONFIG.capacity.catchSec.normal + downtimeMid;
  const quickMid = battleMid + GAME_CONFIG.capacity.catchSec.quick + downtimeMid;
  const quickCatchSlotFactor = normalMid > 0 ? quickMid / normalMid : 1;

  // Remote raids (GO Fest 2026 lifts the daily limit) are unlimited in count;
  // the real constraint is TIME. They're done in waking hours OUTSIDE the
  // in-person event, and skip walking between gyms — so per-raid time is just
  // battle + catch. Available remote hours = each day's hours that aren't the
  // event window and aren't sleep.
  const remoteHoursPerDay = Math.max(0, 24 - (settings.sleepHoursPerNight ?? 8) - hoursPerDay);
  const remoteHours = remoteHoursPerDay * days;
  const remotePerRaidFast = battleSecRange.min + catchSec;
  const remotePerRaidSlow = battleSecRange.max + catchSec;
  const remoteRaidsPerHour = {
    min: Math.floor(3600 / remotePerRaidSlow),
    max: Math.floor(3600 / remotePerRaidFast),
  };
  const remoteCapacity = {
    min: Math.floor(remoteHours * remoteRaidsPerHour.min),
    max: Math.floor(remoteHours * remoteRaidsPerHour.max),
  };

  return {
    hoursPerDay,
    days,
    lobbySize,
    battleSecRange,
    catchSec,
    downtimeSecRange,
    raidsPerHour,
    totalRaids,
    quickCatchSlotFactor,
    remoteHoursPerDay,
    remoteHours,
    remoteCapacity,
  };
}
