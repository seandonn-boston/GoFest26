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
import { energyGoalsFor, energyGoalsForDay } from "@/data/energyGoals";
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
  const inputById = new Map(collapsed.map((i) => [i.bossId, i] as const));

  // A fusion/primal raid is a reorderable per-day target with its own id in the
  // roadTargets order space (distinct from the base species' candy target).
  const energyTargetId = (bossId: string, key: string) => `energy:${bossId}:${key}`;

  // The active fusion/primal energy raids featured on a day, as capacity-consuming
  // shares that sit in the day's priority list. Active = the goal is toggled on
  // (coupled: the weekend card's energy goal; decoupled: the RoL `roadEnergy` set).
  const energySharesForDay = (dayId: string): RawShare[] => {
    const out: RawShare[] = [];
    for (const { bossId, def } of energyGoalsForDay(dayId)) {
      let demand: number;
      if (roadCoupled) {
        const inp = inputById.get(bossId);
        // A goal left on after the boss was deselected must not plan raids —
        // matching the pre-credit below, which also requires `selected`.
        if (!inp?.selected) continue;
        const prog = inp.energy?.[def.key];
        if (!prog?.on) continue;
        const goal = prog.goal > 0 ? prog.goal : def.cost;
        demand = sized(energyRaidsNeeded(prog.have ?? 0, goal, def.perRaid), rewardCase);
      } else {
        if (!(roadEnergy[bossId] ?? []).includes(def.key)) continue;
        demand = sized(energyRaidsNeeded(0, def.cost, def.perRaid), rewardCase);
      }
      if (demand <= 0) continue;
      out.push({
        bossId,
        bossName: def.source,
        raids: demand,
        range: { min: demand, max: demand },
        mewtwo: false,
        energyKey: def.key,
        sprite: def.sprite,
      });
    }
    return out;
  };

  // A share belongs to the 7–8 PM window (Mega Raid Hour, or Friday's Primal Raid
  // Hour) rather than the 6–7 PM 5★ window: Mega roster bosses, and Primal energy.
  const isMegaWindow = (s: RawShare): boolean => {
    if (s.energyKey) return energyGoalsFor(s.bossId).find((d) => d.key === s.energyKey)?.kind === "primal";
    const t = getBoss(s.bossId)?.tier;
    return t === "mega" || t === "super-mega";
  };
  const mergeBands = (a: Record<RiskBand, number>, b: Record<RiskBand, number>): Record<RiskBand, number> => ({
    blue: a.blue + b.blue,
    green: a.green + b.green,
    yellow: a.yellow + b.yellow,
    red: a.red + b.red,
  });

  /**
   * Fit a day's ordered shares into its Raid-Hour windows: 6–7 PM (5★ + fusion/
   * crowned energy) and 7–8 PM (Mega, or Friday Primal). Each window is capped
   * independently so a Mega/Primal target can't spill into the 5★ hour and vice
   * versa. Monday (megaHours = 0) is one 5★ marathon pool, so everything shares it.
   */
  const fitDay = (ordered: RawShare[], day: RoadDay) => {
    const fiveHours = day.raidHourHours - day.megaHours;
    const fiveCap: Range = { min: rpH.min * fiveHours, max: rpH.max * fiveHours };
    if (day.megaHours <= 0) {
      return { filled: fillShares(ordered, fiveCap), capacity: fiveCap };
    }
    const megaCap: Range = { min: rpH.min * day.megaHours, max: rpH.max * day.megaHours };
    const f5 = fillShares(
      ordered.filter((s) => !isMegaWindow(s)),
      fiveCap,
    );
    const fm = fillShares(ordered.filter(isMegaWindow), megaCap);
    return {
      filled: {
        species: [...f5.species, ...fm.species],
        demand: f5.demand + fm.demand,
        fitted: f5.fitted + fm.fitted,
        remaining: f5.remaining + fm.remaining,
        bands: mergeBands(f5.bands, fm.bands),
      },
      capacity: { min: fiveCap.min + megaCap.min, max: fiveCap.max + megaCap.max },
    };
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

    // Even-split a set of roster ids over a window's capacity (after that window's
    // day-locked energy raids), as "fill the raid hour" demand.
    const isMegaTier = (id: string) => {
      const t = getBoss(id)?.tier;
      return t === "mega" || t === "super-mega";
    };
    const evenSplitRoster = (ids: string[], cap: Range, energyDemand: number, day: RoadDay): RawShare[] => {
      const out: RawShare[] = [];
      const budget = Math.max(0, cap.max - energyDemand);
      const n = ids.length;
      if (n <= 0 || budget <= 0) return out;
      const per = Math.floor(budget / n);
      const extra = budget % n;
      ids.forEach((id, i) => {
        const raids = per + (i < extra ? 1 : 0);
        if (raids <= 0) return;
        const formeId = featuredFormeId(day, id);
        const forme = getBoss(formeId);
        out.push({
          bossId: id,
          bossName: forme?.name ?? getBoss(id)!.name,
          formeBossId: formeId !== id ? formeId : undefined,
          raids,
          range: { min: raids, max: raids },
          mewtwo: false,
        });
      });
      return out;
    };

    for (const day of ROAD_DAYS) {
      if (!playDays[day.id]) continue;
      const fiveHours = day.raidHourHours - day.megaHours;
      const fiveCap: Range = { min: rpH.min * fiveHours, max: rpH.max * fiveHours };
      const megaCap: Range = { min: rpH.min * day.megaHours, max: rpH.max * day.megaHours };
      // An explicit per-day drag list is also a per-day SELECTION: targets the user
      // toggled off this day are dropped BEFORE the even split, so the day's whole
      // raid-hour budget flows to the targets that remain (not to ghost shares).
      const explicit = roadTargets[day.id];
      const pickSet = explicit ? new Set(explicit) : null;
      const energyShares = energySharesForDay(day.id).filter(
        (e) => !pickSet || pickSet.has(energyTargetId(e.bossId, e.energyKey!)),
      );
      const rosterIds = Array.from(new Set(day.bossIds.map(toPrimary)))
        .filter((id) => roadSelected[id] && isLocal(id) && (!pickSet || pickSet.has(id)))
        .sort((a, z) => (rosterRank.get(a) ?? 0) - (rosterRank.get(z) ?? 0));

      // Split roster + energy demand across the two Raid-Hour windows so each is
      // filled independently (Monday's single 5★ pool keeps everything together).
      let rosterShares: RawShare[];
      if (day.megaHours <= 0) {
        const energyDemand = energyShares.reduce((s, e) => s + e.raids, 0);
        rosterShares = evenSplitRoster(rosterIds, fiveCap, energyDemand, day);
      } else {
        const fiveEnergy = energyShares.filter((s) => !isMegaWindow(s)).reduce((s, e) => s + e.raids, 0);
        const megaEnergy = energyShares.filter(isMegaWindow).reduce((s, e) => s + e.raids, 0);
        rosterShares = [
          ...evenSplitRoster(
            rosterIds.filter((id) => !isMegaTier(id)),
            fiveCap,
            fiveEnergy,
            day,
          ),
          ...evenSplitRoster(rosterIds.filter(isMegaTier), megaCap, megaEnergy, day),
        ];
      }

      // Respect the user's drag order when set; otherwise energy first, then roster.
      const byTarget = new Map<string, RawShare>([
        ...energyShares.map((e) => [energyTargetId(e.bossId, e.energyKey!), e] as const),
        ...rosterShares.map((r) => [r.bossId, r] as const),
      ]);
      const ordered = explicit
        ? explicit.map((tid) => byTarget.get(tid)).filter((s): s is RawShare => s !== undefined)
        : [...energyShares, ...rosterShares];

      const { filled, capacity } = fitDay(ordered, day);
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
        capacity,
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
  // Remote allocations are netted out (mirroring computeBlockPlan's blockTotal):
  // raids the user assigned to remote passes don't need weekday raid-hour slots.
  const remoteFor = (id: string) => (settings.useRemoteRaids ? Math.max(0, Math.round(remoteAllocations[id] ?? 0)) : 0);
  const remaining = new Map<string, number>();
  for (const input of collapsed) {
    if (!input.selected) continue;
    const boss = getBoss(input.bossId);
    const res = resultById.get(input.bossId);
    if (!boss || !res || !bossIsLocal(boss, settings.region)) continue;
    const n = sized(res.raids, rewardCase) - remoteFor(input.bossId);
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
  // raids beyond the candy goal don't reduce it). Reserving it BEFORE the day loop
  // means the candy-featured days (esp. Monday, which runs first) only fill
  // whatever candy the energy raids don't already cover — so a goal of "15 Kyurem
  // candy + 5 White + 5 Black" plans as 15 total raids (10 day-locked, 5 anywhere).
  // The energy raids themselves are counted below, where they sit as capacity-
  // consuming shares in each day's list — so this reserves only their CANDY effect,
  // not the raid count. The assumption is optimistic (each goal alone in its
  // window); the day loop records what ACTUALLY fits and the fix-up after the loop
  // claws back any credit for energy raids that were squeezed out (two goals
  // sharing one window, a candy target dragged above the energy item, or the
  // energy chip deselected for the day) — so the weekend is never reduced by
  // raids that will not happen.
  const assumedEnergy = new Map<string, number>(); // bossId → assumed energy raids (window-capped)
  const candyNeed0 = new Map<string, number>(); // bossId → candy need before the credit
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
      const day = ROAD_DAYS.find((d) => d.id === def.roadDayId);
      // Cap at the raids the goal's Raid-Hour window can hold (5★ 6–7 PM, or Mega/
      // Primal 7–8 PM) — you can't bank more energy than fits that one hour.
      const windowHours = day ? (def.kind === "primal" ? day.megaHours : day.raidHourHours - day.megaHours) : 1;
      const need = sized(energyRaidsNeeded(prog.have ?? 0, goal, def.perRaid), rewardCase);
      energyRaids += Math.min(need, rpH.max * windowHours);
    }
    if (energyRaids <= 0) continue;
    const candyNeed = remaining.get(input.bossId) ?? 0;
    const credit = Math.min(candyNeed, energyRaids);
    if (credit <= 0) continue;
    assumedEnergy.set(input.bossId, energyRaids);
    candyNeed0.set(input.bossId, candyNeed);
    remaining.set(input.bossId, candyNeed - credit);
    headStart[input.bossId] = (headStart[input.bossId] ?? 0) + credit;
  }
  // Energy raids that actually fit their day's window, per species (fills below).
  const actualEnergy = new Map<string, number>();

  for (const day of ROAD_DAYS) {
    if (!playDays[day.id]) continue;

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
    // The day's fusion/primal raids are reorderable targets too — they default to
    // the top of the list, and (unless the user drags candy above them) fill first.
    const energyShares = energySharesForDay(day.id);
    const energyByTarget = new Map(energyShares.map((e) => [energyTargetId(e.bossId, e.energyKey!), e] as const));

    const explicit = roadTargets[day.id];
    const mondayOverflow =
      !explicit && day.id === "mon" && worstBlock
        ? worstBlock.species.filter((s) => s.remaining > 0 && featured.has(s.bossId) && (remaining.get(s.bossId) ?? 0) > 0)
        : [];
    let shares: RawShare[];
    let focus: RoadDayPlan["focus"];
    if (explicit) {
      // The explicit list mixes energy pseudo-ids and candy boss ids, in drag order.
      shares = explicit
        .map((tid) => {
          const e = energyByTarget.get(tid);
          if (e) return e;
          return featured.has(tid) && (remaining.get(tid) ?? 0) > 0 ? buildShare(tid) : null;
        })
        .filter((s): s is RawShare => s !== null);
    } else if (mondayOverflow.length) {
      // No energy raids on Monday, so this stays the weekend-overflow steering.
      shares = [...energyShares, ...mondayOverflow.map((s) => buildShare(s.bossId))];
      focus = { blockName: worstBlock!.name, overflow: worstBlock!.remaining };
    } else {
      const candy = Array.from(featured)
        .filter((id) => (remaining.get(id) ?? 0) > 0)
        .map(buildShare)
        .sort(
          (a, z) => rankOf(a.bossId) - rankOf(z.bossId) || (rosterRank.get(a.bossId) ?? 0) - (rosterRank.get(z.bossId) ?? 0),
        );
      shares = [...energyShares, ...candy]; // energy defaults to the top
    }

    // Fit the day's two Raid-Hour windows (6–7 PM 5★, 7–8 PM Mega/Primal).
    const { filled, capacity } = fitDay(shares, day);
    for (const s of filled.species) {
      if (s.energyKey) {
        // Energy shares just consume capacity + count as raids done; their candy
        // effect was reserved by the pre-credit and reconciled after the loop.
        if (s.fitted > 0) actualEnergy.set(s.bossId, (actualEnergy.get(s.bossId) ?? 0) + s.fitted);
        continue;
      }
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
      capacity,
      focus,
      ...filled,
    });
  }

  // Pre-credit fix-up: the credit assumed each energy goal fills its window alone;
  // where goals competed for one window (Thursday's two Crowned raids, Friday's
  // two Primals) or the user squeezed the energy out, the standing credit is
  // re-derived from the raids that actually fit — min(candy need, actual energy
  // raids) — and the phantom remainder is removed from the head start.
  for (const [bossId, assumed] of assumedEnergy) {
    const need = candyNeed0.get(bossId) ?? 0;
    const givenCredit = Math.min(need, assumed);
    const correctCredit = Math.min(need, actualEnergy.get(bossId) ?? 0);
    const fixup = givenCredit - correctCredit;
    if (fixup <= 0) continue;
    remaining.set(bossId, (remaining.get(bossId) ?? 0) + fixup);
    const next = (headStart[bossId] ?? 0) - fixup;
    if (next > 0) headStart[bossId] = next;
    else delete headStart[bossId];
  }

  return { days, headStart, totalFitted };
}
