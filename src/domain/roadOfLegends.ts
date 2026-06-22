// Road of Legends — the weekday raid-hour plan that runs INTO the weekend.
//
// Each selected weekday (Mon Jul 6 → Fri Jul 10) has a Raid Hour whose length is
// fixed (Monday 2h, the rest 1h). Using the same raids/hour assumption as the
// weekend, that gives a per-day raid budget. We pour the player's already-chosen
// targets (top-section selections) into each day's budget — only targets actually
// featured that day, in their weekend priority order — and whatever fits is a
// HEAD START that reduces the weekend's remaining demand (computeBlockPlan reads
// the returned `headStart`). Mewtwo is absent (Super Mega Raids are weekend-only).

import { getBoss, RAID_BOSSES } from "@/data";
import { ROAD_DAYS, type RoadDay } from "@/data/roadOfLegends";
import { collapseForms, primaryFormId } from "./forms";
import { bossIsLocal } from "./region";
import { DEFAULT_SETTINGS, type PlannerSettings } from "./settings";
import {
  fillShares,
  globalPriorityFromBlocks,
  sized,
  type BlockSpeciesShare,
  type RawShare,
  type RiskBand,
} from "./blockPlan";
import type { BossInput, BossResult, CapacityModel, Range } from "./types";

export interface RoadDayPlan {
  id: string;
  label: string;
  dateLabel: string;
  raidHourLabel: string;
  raidHourHours: number;
  /** Raids that fit the day's raid-hour block (time-luck range; max = 100%). */
  capacity: Range;
  /** Sized raids of featured targets demanded this day. */
  demand: number;
  /** Raids that fit the block (the bar fill). */
  fitted: number;
  /** Raids that didn't fit the raid hour. */
  remaining: number;
  bands: Record<RiskBand, number>;
  species: BlockSpeciesShare[];
}

export interface RoadPlan {
  /** Only the days the player toggled on, in calendar order. */
  days: RoadDayPlan[];
  /** Per primary-species id → raids done across the selected weekdays. Feeds
   *  computeBlockPlan as a weekend-demand reduction. */
  headStart: Record<string, number>;
  /** Total raids fitted across all selected weekdays. */
  totalFitted: number;
}

/** Primary (shared-resource) id for any forme id. */
function toPrimary(id: string): string {
  const boss = getBoss(id);
  return boss?.formGroup ? primaryFormId(boss.formGroup) : id;
}

/** The specific forme id of `primary` featured on a given day (prefer the
 *  primary itself; otherwise the first listed forme of that species). */
function featuredFormeId(day: RoadDay, primary: string): string {
  if (day.bossIds.includes(primary)) return primary;
  return day.bossIds.find((id) => toPrimary(id) === primary) ?? primary;
}

const rosterRank = new Map(RAID_BOSSES.map((b, i) => [b.id, i] as const));

/**
 * Build the Road of Legends weekday plan from the player's existing selections.
 * Targets are spent in weekend-priority order, day by day, so high-priority
 * targets are knocked out first (Monday's 2-hour block does the heavy lifting);
 * a target's remaining need carries to the next selected day.
 */
export function computeRoadPlan(
  inputs: BossInput[],
  results: BossResult[],
  capacity: CapacityModel,
  settings: PlannerSettings = DEFAULT_SETTINGS,
  playDays: Record<string, boolean> = {},
  blockPriority: Record<string, string[]> = {},
): RoadPlan {
  const rewardCase = settings.rewardCase;
  const rpH = capacity.raidsPerHour;
  const resultById = new Map(results.map((r) => [r.bossId, r]));
  // Multi-form species collapse to one shared-resource target (primary forme).
  const collapsed = collapseForms(inputs);

  // Raids still wanted per selected, LOCAL species (region-locked targets can't
  // be raided in person during a weekday raid hour — they stay weekend/remote).
  const remaining = new Map<string, number>();
  for (const input of collapsed) {
    if (!input.selected) continue;
    const boss = getBoss(input.bossId);
    const res = resultById.get(input.bossId);
    if (!boss || !res || !bossIsLocal(boss, settings.region)) continue;
    const n = sized(res.raids, rewardCase);
    if (n > 0) remaining.set(input.bossId, n);
  }

  // Rank shares by the player's weekend priority (derived from the per-block
  // orders), then roster order — the same priority the weekend respects.
  const globalRank = new Map(globalPriorityFromBlocks(blockPriority).map((id, i) => [id, i] as const));
  const rankOf = (id: string) => globalRank.get(id) ?? Infinity;

  const headStart: Record<string, number> = {};
  const days: RoadDayPlan[] = [];
  let totalFitted = 0;

  for (const day of ROAD_DAYS) {
    if (!playDays[day.id]) continue;
    const cap: Range = { min: rpH.min * day.raidHourHours, max: rpH.max * day.raidHourHours };

    // Featured-this-day primaries that the player still wants.
    const primaries = Array.from(new Set(day.bossIds.map(toPrimary))).filter(
      (id) => (remaining.get(id) ?? 0) > 0,
    );
    const shares: RawShare[] = primaries.map((id) => {
      const boss = getBoss(id)!;
      const res = resultById.get(id)!;
      const total = sized(res.raids, rewardCase);
      const rem = remaining.get(id)!;
      const range: Range =
        total > 0
          ? { min: Math.round((res.raids.min * rem) / total), max: Math.round((res.raids.max * rem) / total) }
          : { min: rem, max: rem };
      const formeId = featuredFormeId(day, id);
      const forme = getBoss(formeId);
      return {
        bossId: id,
        bossName: forme?.name ?? boss.name,
        formeBossId: formeId !== id ? formeId : undefined,
        raids: rem,
        range,
        mewtwo: false,
      };
    });
    shares.sort(
      (a, z) => rankOf(a.bossId) - rankOf(z.bossId) || (rosterRank.get(a.bossId) ?? 0) - (rosterRank.get(z.bossId) ?? 0),
    );

    const filled = fillShares(shares, cap);
    for (const s of filled.species) {
      if (s.fitted <= 0) continue;
      remaining.set(s.bossId, Math.max(0, (remaining.get(s.bossId) ?? 0) - s.fitted));
      headStart[s.bossId] = (headStart[s.bossId] ?? 0) + s.fitted;
    }
    totalFitted += filled.fitted;

    days.push({
      id: day.id,
      label: day.label,
      dateLabel: day.dateLabel,
      raidHourLabel: day.raidHourLabel,
      raidHourHours: day.raidHourHours,
      capacity: cap,
      ...filled,
    });
  }

  return { days, headStart, totalFitted };
}
