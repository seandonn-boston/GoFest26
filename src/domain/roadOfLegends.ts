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
import { energyGoalsFor } from "@/data/energyGoals";
import { collapseForms, primaryFormId } from "./forms";
import { energyRaidsNeeded } from "./fusionEnergy";
import { bossIsLocal } from "./region";
import { DEFAULT_SETTINGS, type PlannerSettings } from "./settings";
import {
  computeBlockPlan,
  fillShares,
  globalPriorityFromBlocks,
  mostOverflowingBlock,
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
  /** Set on Monday when its raid hour is being steered at the weekend's
   *  most-overflowing habitat block (vs. plain featured-priority order). */
  focus?: { blockName: string; overflow: number };
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
  remoteAllocations: Record<string, number> = {},
  quickCatchBlocks: Record<string, boolean> = {},
  /** Per-day explicit pre-farm targets, in the user's order. A day not present
   *  falls back to "all featured targets in weekend-priority order". */
  roadTargets: Record<string, string[]> = {},
  /** True (default): the RoL plan mirrors the weekend targets. False: it's built
   *  from the player's independent RoL picks (`roadSelected` / `roadEnergy`). */
  roadCoupled: boolean = true,
  /** Decoupled roster targets (primary/forme boss id → picked). */
  roadSelected: Record<string, boolean> = {},
  /** Decoupled fusion/primal goals (base boss id → energy keys turned on). */
  roadEnergy: Record<string, string[]> = {},
): RoadPlan {
  const rewardCase = settings.rewardCase;
  const rpH = capacity.raidsPerHour;
  const resultById = new Map(results.map((r) => [r.bossId, r]));
  // Multi-form species collapse to one shared-resource target (primary forme).
  const collapsed = collapseForms(inputs);
  const isLocal = (id: string) => {
    const b = getBoss(id);
    return !!b && bossIsLocal(b, settings.region);
  };

  // ── DECOUPLED: the player's independent Road-of-Legends agenda ──────────────
  // Build the plan straight from `roadSelected` / `roadEnergy` instead of the
  // weekend picks. Demand is "fill the raid hour": each played day's fusion/primal
  // energy raids are reserved first (day-locked), then the remaining capacity is
  // split evenly across that day's picked roster targets. `headStart` is still
  // returned — computeBlockPlan only reduces demand for weekend-selected bosses, so
  // an overlapping target credits the weekend while a non-weekend one is standalone.
  if (!roadCoupled) {
    const headStart: Record<string, number> = {};
    const days: RoadDayPlan[] = [];
    let totalFitted = 0;

    // Day-locked energy raids: fixed fuse-cost intent, credited to the base species.
    const energyByDay: Record<string, number> = {};
    for (const [bossId, keys] of Object.entries(roadEnergy)) {
      if (!keys?.length) continue;
      for (const def of energyGoalsFor(bossId)) {
        if (!keys.includes(def.key) || !def.roadDayId || !playDays[def.roadDayId]) continue;
        const n = sized(energyRaidsNeeded(0, def.cost, def.perRaid), rewardCase);
        if (n <= 0) continue;
        energyByDay[def.roadDayId] = (energyByDay[def.roadDayId] ?? 0) + n;
        headStart[bossId] = (headStart[bossId] ?? 0) + n;
        totalFitted += n;
      }
    }

    for (const day of ROAD_DAYS) {
      if (!playDays[day.id]) continue;
      const fullCap: Range = { min: rpH.min * day.raidHourHours, max: rpH.max * day.raidHourHours };
      const eRaids = energyByDay[day.id] ?? 0;
      // Roster targets picked for this day, region-raidable, in roster order.
      const rosterIds = Array.from(new Set(day.bossIds.map(toPrimary)))
        .filter((id) => roadSelected[id] && isLocal(id))
        .sort((a, z) => (rosterRank.get(a) ?? 0) - (rosterRank.get(z) ?? 0));
      const rosterCap = Math.max(0, fullCap.max - eRaids);
      const shares: RawShare[] = [];
      const n = rosterIds.length;
      if (n > 0 && rosterCap > 0) {
        const per = Math.floor(rosterCap / n);
        const extra = rosterCap % n;
        rosterIds.forEach((id, i) => {
          const raids = per + (i < extra ? 1 : 0);
          if (raids <= 0) return;
          const formeId = featuredFormeId(day, id);
          const forme = getBoss(formeId);
          shares.push({
            bossId: id,
            bossName: forme?.name ?? getBoss(id)!.name,
            formeBossId: formeId !== id ? formeId : undefined,
            raids,
            range: { min: raids, max: raids },
            mewtwo: false,
          });
        });
      }
      const cap: Range = { min: Math.max(0, fullCap.min - eRaids), max: rosterCap };
      const filled = fillShares(shares, cap);
      for (const s of filled.species) {
        if (s.fitted > 0) headStart[s.bossId] = (headStart[s.bossId] ?? 0) + s.fitted;
      }
      totalFitted += filled.fitted;
      days.push({
        id: day.id,
        label: day.label,
        dateLabel: day.dateLabel,
        raidHourLabel: day.raidHourLabel,
        raidHourHours: day.raidHourHours,
        capacity: fullCap,
        ...filled,
      });
    }

    return { days, headStart, totalFitted };
  }

  // Look at the weekend first (no weekday head start): which 3-hour habitat
  // block has the most raids that WON'T fit? Monday's marathon raid hour — the
  // only weekday featuring the full 5★ roster — is steered there, working down
  // that block's priority order, so the heaviest weekend overload gets relieved.
  const worstBlock = mostOverflowingBlock(
    computeBlockPlan(inputs, results, capacity, settings, blockPriority, remoteAllocations, quickCatchBlocks, {}),
  );

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

  // Day-locked energy raids pull double duty. The fused / crowned / primal raids
  // (White Kyurem on Tue, Black Kyurem on Wed, …) are the ONLY source of their
  // energy and run on one specific Road of Legends day — but they're still raids
  // of the BASE species, so they also bank its Candy/XL. Reserve that candy credit
  // up front as a head start, capped at the species' candy need (extra energy
  // raids beyond the candy goal don't reduce it). Reserving it before the day loop
  // means the flexible candy days below only fill whatever candy the energy raids
  // don't already cover — so a goal of "15 Kyurem candy + 5 White + 5 Black" plans
  // as 15 total raids (10 day-locked, 5 anywhere), not 25.
  for (const input of collapsed) {
    if (!input.selected) continue;
    const goals = energyGoalsFor(input.bossId);
    if (!goals.length) continue;
    let energyRaids = 0;
    for (const def of goals) {
      // The energy is only earnable on its day, and only if the player raids that day.
      if (!def.roadDayId || !playDays[def.roadDayId]) continue;
      const prog = input.energy?.[def.key];
      if (!prog?.on) continue;
      const goal = prog.goal > 0 ? prog.goal : def.cost;
      energyRaids += sized(energyRaidsNeeded(prog.have ?? 0, goal, def.perRaid), rewardCase);
    }
    if (energyRaids <= 0) continue;
    const candyNeed = remaining.get(input.bossId) ?? 0;
    const credit = Math.min(candyNeed, energyRaids);
    if (credit <= 0) continue;
    remaining.set(input.bossId, candyNeed - credit);
    headStart[input.bossId] = (headStart[input.bossId] ?? 0) + credit;
    totalFitted += credit;
  }

  for (const day of ROAD_DAYS) {
    if (!playDays[day.id]) continue;
    const cap: Range = { min: rpH.min * day.raidHourHours, max: rpH.max * day.raidHourHours };

    const featured = new Set(day.bossIds.map(toPrimary));
    const buildShare = (id: string): RawShare => {
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
    };

    // Monday is steered at the most-overflowing weekend block: raid that block's
    // overflow targets (the ones the weekend can't fit), in ITS priority order —
    // so the heaviest overload is relieved first. Other days, and Monday when the
    // worst block has no Monday-raidable overflow, fall back to featured-this-day
    // targets in global weekend-priority order. `remaining` only holds local
    // targets, so region-locked/Mewtwo overflow is naturally skipped.
    // The user's explicit per-day picks win (in their drag order). Otherwise:
    // Monday auto-steers at the worst weekend block, other days use featured-in-
    // priority order.
    const explicit = roadTargets[day.id];
    const mondayOverflow =
      !explicit && day.id === "mon" && worstBlock
        ? worstBlock.species.filter((s) => s.remaining > 0 && featured.has(s.bossId) && (remaining.get(s.bossId) ?? 0) > 0)
        : [];
    let shares: RawShare[];
    let focus: RoadDayPlan["focus"];
    if (explicit) {
      shares = explicit
        .filter((id) => featured.has(id) && (remaining.get(id) ?? 0) > 0)
        .map(buildShare); // in the user's chosen order
    } else if (mondayOverflow.length) {
      shares = mondayOverflow.map((s) => buildShare(s.bossId)); // already in block-priority order
      focus = { blockName: worstBlock!.name, overflow: worstBlock!.remaining };
    } else {
      shares = Array.from(featured)
        .filter((id) => (remaining.get(id) ?? 0) > 0)
        .map(buildShare)
        .sort(
          (a, z) => rankOf(a.bossId) - rankOf(z.bossId) || (rosterRank.get(a.bossId) ?? 0) - (rosterRank.get(z.bossId) ?? 0),
        );
    }

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
      focus,
      ...filled,
    });
  }

  return { days, headStart, totalFitted };
}
