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
  const frac = (lobby - cfg.minRaiders) / (20 - cfg.minRaiders); // 0 at min, 1 at 20
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

  const catchSec = settings.quickCatch
    ? GAME_CONFIG.capacity.catchSec.quick
    : GAME_CONFIG.capacity.catchSec.normal;

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

  return {
    hoursPerDay,
    days,
    lobbySize,
    battleSecRange,
    catchSec,
    downtimeSecRange,
    raidsPerHour,
    totalRaids,
  };
}
