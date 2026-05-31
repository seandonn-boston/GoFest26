import { GAME_CONFIG } from "@/data/config";
import { DEFAULT_SETTINGS, type PlannerSettings } from "./settings";
import type { CapacityModel } from "./types";

/**
 * Models the maximum number of raids a power-user can realistically complete
 * across the weekend, from raid duration + between-raid downtime.
 */
export function computeCapacity(settings: PlannerSettings = DEFAULT_SETTINGS): CapacityModel {
  const { hoursPerDay, days } = GAME_CONFIG.event;
  const { raidDurationSec, downtimeSecRange } = settings;

  // Shorter downtime => more raids per hour, and vice-versa.
  const perRaidFast = raidDurationSec + downtimeSecRange.min;
  const perRaidSlow = raidDurationSec + downtimeSecRange.max;

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
    raidDurationSec,
    downtimeSecRange,
    raidsPerHour,
    totalRaids,
  };
}
