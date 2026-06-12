// Per-habitat-block plan: how many raids land in each of the weekend's six
// habitat blocks, and — within each block — how confident the player can be of
// actually completing each raid (the colored "risk bands").
//
// Two independent sources of variability drive the bands:
//   • candy luck  — each boss's raids-needed range (min = lucky drops → fewer
//                   raids, max = unlucky → more). Carried as `range` per share.
//   • time luck   — each block's capacity range (slow vs. fast raiding pace).
//
// Mewtwo is the ONLY species that spans the whole weekend, so it is allocated
// LAST, after every fixed-window boss is pinned to its block, and is used to
// LEVEL the blocks (water-fill the lightest first). Its mega-energy raids are
// day-locked (X energy is Saturday-only, Y energy Sunday-only); the shared
// leveling surplus (XL/Candy, earned from any Mewtwo raid) is free to fall on
// whichever day still needs evening out.

import { getBoss, MEWTWO_X_ID, MEWTWO_Y_ID } from "@/data";
import { HABITATS } from "@/data/habitats";
import { midpoint } from "@/lib/math";
import { DEFAULT_SETTINGS, type PlannerSettings } from "./settings";
import type { BossInput, BossResult, CapacityModel, EventDay, HabitatWindow, Range } from "./types";

export type RiskBand = "blue" | "green" | "yellow" | "red";

/** Render/stack order, safest → least certain. */
export const RISK_BANDS: readonly RiskBand[] = ["blue", "green", "yellow", "red"];

const emptyBands = (): Record<RiskBand, number> => ({ blue: 0, green: 0, yellow: 0, red: 0 });

export interface BlockSpeciesShare {
  bossId: string;
  bossName: string;
  /** Sized raids of this boss demanded in this block. */
  raids: number;
  /** Candy-luck raid range for this block share: min = best case, max = worst. */
  range: Range;
  /** Raids that actually fit inside the block's capacity (≤ raids). */
  fitted: number;
  /** Raids that couldn't fit (raids − fitted) — reported, never shown in the bar. */
  remaining: number;
  /** Per-band breakdown of the FITTED raids (sums to `fitted`). */
  bands: Record<RiskBand, number>;
  /** True for a Mewtwo balancing fill (vs. a fixed-window species). */
  mewtwo: boolean;
}

export interface BlockPlan {
  day: EventDay;
  name: string;
  startHour: number;
  endHour: number;
  /** Raids that fit in this block's hours — the time-luck range; `max` is 100%. */
  capacity: Range;
  /** Total sized raids demanded in this block (after Mewtwo balancing). */
  demand: number;
  /** Total raids that fit (the bar fill; never exceeds capacity.max). */
  fitted: number;
  /** Total raids that didn't fit — drives the under-bar shortfall warning. */
  remaining: number;
  /** Aggregate band counts for the block (sums to `fitted`). */
  bands: Record<RiskBand, number>;
  /** Species in priority order (highest first); the tail is cut when over capacity. */
  species: BlockSpeciesShare[];
}

export interface WeekendBlockPlan {
  blocks: BlockPlan[];
  /** True when every block's whole demand fits its capacity (no shortfall). */
  feasible: boolean;
}

/** Sizes a raids range to a single count per the configured reward case. */
function sized(range: Range | undefined, rewardCase: PlannerSettings["rewardCase"]): number {
  if (!range) return 0;
  if (rewardCase === "optimistic") return range.min;
  if (rewardCase === "safe") return range.max;
  return Math.ceil(midpoint(range));
}

/** Habitat-block indices a set of availability windows overlaps. */
function blockIndicesForWindows(windows: HabitatWindow[]): number[] {
  const out: number[] = [];
  HABITATS.forEach((h, i) => {
    if (windows.some((w) => w.day === h.day && w.startHour < h.endHour && w.endHour > h.startHour)) out.push(i);
  });
  return out;
}

/**
 * Pour `budget` raids into the given blocks, always topping up whichever block
 * currently has the fewest total raids — the classic water-fill that levels the
 * blocks out. When `cap` is given, a block that has reached its capacity is
 * skipped (Mewtwo is never forced into a block that's already full of fixed
 * raids); leftover budget that fits nowhere is simply dropped. Mutates `running`
 * totals and returns the units added per index.
 */
function waterfill(running: number[], idxs: number[], budget: number, cap?: number[]): number[] {
  const add = new Array(running.length).fill(0);
  let remaining = Math.max(0, Math.round(budget));
  while (remaining-- > 0) {
    let lo = -1;
    for (const i of idxs) {
      if (cap && running[i] >= cap[i]) continue;
      if (lo < 0 || running[i] < running[lo]) lo = i;
    }
    if (lo < 0) break; // every candidate block is full
    running[lo] += 1;
    add[lo] += 1;
  }
  return add;
}

/**
 * Classify a species' FITTED raids in a block into risk bands. Need-band order
 * over the species' demanded raids: the candy-lucky floor (`range.min`) is
 * guaranteed need → blue, then the uncertain remainder spreads green:yellow:red
 * in a 5:3:2 ratio. Only the first `fitted` raids are colored — when a block is
 * over capacity the least-certain tail (red) is what gets cut, so a fully-fit
 * species shows its whole blue→red range while a cut species keeps the certain
 * part. Time luck downgrades a blue raid to green once past guaranteed pace.
 */
export function bandsForSpecies(
  fitted: number,
  demand: number,
  range: Range,
  cumStart: number,
  capacity: Range,
): Record<RiskBand, number> {
  const bands = emptyBands();
  const sure = Math.min(demand, Math.max(0, Math.round(range.min)));
  const uncertain = demand - sure;
  const green = Math.round((uncertain * 5) / 10);
  const yellow = Math.round((uncertain * 3) / 10);
  for (let k = 0; k < fitted; k++) {
    const pos = cumStart + k;
    let band: RiskBand =
      k < sure ? "blue" : k < sure + green ? "green" : k < sure + green + yellow ? "yellow" : "red";
    if (band === "blue" && pos >= capacity.min) band = "green";
    bands[band] += 1;
  }
  return bands;
}

interface RawShare {
  bossId: string;
  bossName: string;
  raids: number;
  range: Range;
  mewtwo: boolean;
}

/**
 * Build the six-block weekend plan from the per-boss results. Fixed-window
 * bosses pin to their habitat block(s); Mewtwo levels the rest (day-locked
 * energy + free leveling surplus); each block is then risk-banded in priority
 * order (highest priority fills first; the tail is cut when over capacity).
 */
export function computeBlockPlan(
  inputs: BossInput[],
  results: BossResult[],
  capacity: CapacityModel,
  settings: PlannerSettings = DEFAULT_SETTINGS,
  priorityOrder: string[] = [],
): WeekendBlockPlan {
  const rewardCase = settings.rewardCase;
  const rpH = capacity.raidsPerHour;
  const resultById = new Map(results.map((r) => [r.bossId, r]));
  const inputById = new Map(inputs.map((i) => [i.bossId, i]));
  const rank = new Map(priorityOrder.map((id, i) => [id, i] as const));
  const priorityOf = (id: string) => rank.get(id) ?? Infinity;
  const isMewtwo = (id: string) => id === MEWTWO_X_ID || id === MEWTWO_Y_ID;

  const shares: RawShare[][] = HABITATS.map(() => []);
  const capacities: Range[] = HABITATS.map((h) => ({
    min: rpH.min * (h.endHour - h.startHour),
    max: rpH.max * (h.endHour - h.startHour),
  }));

  // 1. Fixed-window species → their habitat block(s). A boss spanning several
  //    blocks is split evenly (in practice each occupies exactly one block).
  for (const input of inputs) {
    if (!input.selected || isMewtwo(input.bossId)) continue;
    const boss = getBoss(input.bossId);
    const res = resultById.get(input.bossId);
    if (!boss || !res) continue;
    const total = sized(res.raids, rewardCase);
    if (total <= 0) continue;
    const idxs = blockIndicesForWindows(boss.windows);
    if (!idxs.length) continue;
    idxs.forEach((bi, k) => {
      const share = Math.floor(total / idxs.length) + (k < total % idxs.length ? 1 : 0);
      if (share <= 0) return;
      const frac = share / total;
      shares[bi].push({
        bossId: boss.id,
        bossName: boss.name,
        raids: share,
        range: { min: Math.round(res.raids.min * frac), max: Math.round(res.raids.max * frac) },
        mewtwo: false,
      });
    });
  }

  // 2. Mewtwo, allocated last. Energy is day-locked; the shared leveling surplus
  //    (XL/Candy from any Mewtwo raid) is free to land on either day.
  const xRes = resultById.get(MEWTWO_X_ID);
  const yRes = resultById.get(MEWTWO_Y_ID);
  const xSel = !!inputById.get(MEWTWO_X_ID)?.selected;
  const ySel = !!inputById.get(MEWTWO_Y_ID)?.selected;

  const satLocked = xSel ? sized(xRes?.needs.megaEnergy?.raidsRange, rewardCase) : 0;
  const sunLocked = ySel ? sized(yRes?.needs.megaEnergy?.raidsRange, rewardCase) : 0;
  // Each Mewtwo raid yields both Candy and XL, so the shared leveling demands the
  // larger of the two; the part beyond the day-locked energy raids is flexible.
  const sharedLevel = xSel
    ? Math.max(sized(xRes?.needs.xlCandy?.raidsRange, rewardCase), sized(xRes?.needs.candy?.raidsRange, rewardCase))
    : 0;
  const fluid = Math.max(0, sharedLevel - satLocked - sunLocked);

  const ratioFor = (res: BossResult | undefined): Range => {
    const e = sized(res?.raids, rewardCase);
    if (!res || e <= 0) return { min: 1, max: 1 };
    return { min: res.raids.min / e, max: res.raids.max / e };
  };
  const xRatio = ratioFor(xRes);
  const yRatio = ratioFor(yRes);

  const satIdx = HABITATS.map((h, i) => (h.day === "sat" ? i : -1)).filter((i) => i >= 0);
  const sunIdx = HABITATS.map((h, i) => (h.day === "sun" ? i : -1)).filter((i) => i >= 0);
  const allIdx = HABITATS.map((_, i) => i);

  // Cap Mewtwo so it never inflates a block past its capacity (a block already
  // full of fixed raids gets no Mewtwo — it can't be raided there anyway).
  const caps = capacities.map((c) => c.max);
  const running = shares.map((list) => list.reduce((s, sh) => s + sh.raids, 0));
  const addSat = waterfill(running, satIdx, satLocked, caps);
  const addSun = waterfill(running, sunIdx, sunLocked, caps);
  const addFluid = waterfill(running, allIdx, fluid, caps);

  HABITATS.forEach((h, i) => {
    const n = addSat[i] + addSun[i] + addFluid[i];
    if (n <= 0) return;
    // Every Mewtwo raid in a Saturday block is form X; Sunday is form Y.
    const onSat = h.day === "sat";
    const formId = onSat ? MEWTWO_X_ID : MEWTWO_Y_ID;
    const rt = onSat ? xRatio : yRatio;
    shares[i].push({
      bossId: formId,
      bossName: getBoss(formId)?.name ?? "Mega Mewtwo",
      raids: n,
      range: { min: Math.round(n * rt.min), max: Math.round(n * rt.max) },
      mewtwo: true,
    });
  });

  // 3. Order each block by priority and risk-band it. Default tie-break: fixed
  //    species before Mewtwo (the all-weekend filler takes the riskier tail),
  //    then roster sort order — until the user ranks them explicitly.
  const blocks: BlockPlan[] = HABITATS.map((h, i) => {
    const ordered = [...shares[i]].sort((a, z) => {
      const pa = priorityOf(a.bossId);
      const pz = priorityOf(z.bossId);
      if (pa !== pz) return pa - pz;
      if (a.mewtwo !== z.mewtwo) return a.mewtwo ? 1 : -1;
      return (getBoss(a.bossId)?.sortPriority ?? 0) - (getBoss(z.bossId)?.sortPriority ?? 0);
    });
    const cap = capacities[i];
    let cum = 0;
    let fitted = 0;
    let remaining = 0;
    const agg = emptyBands();
    const species: BlockSpeciesShare[] = ordered.map((sh) => {
      // Fill to 100% in priority order: each species takes as many of its raids
      // as still fit under capacity.max; the rest are this species' shortfall.
      const fit = Math.max(0, Math.min(sh.raids, cap.max - cum));
      const bands = bandsForSpecies(fit, sh.raids, sh.range, cum, cap);
      cum += sh.raids;
      fitted += fit;
      remaining += sh.raids - fit;
      for (const k of RISK_BANDS) agg[k] += bands[k];
      return {
        bossId: sh.bossId,
        bossName: sh.bossName,
        raids: sh.raids,
        range: sh.range,
        fitted: fit,
        remaining: sh.raids - fit,
        bands,
        mewtwo: sh.mewtwo,
      };
    });
    return {
      day: h.day,
      name: h.name,
      startHour: h.startHour,
      endHour: h.endHour,
      capacity: cap,
      demand: cum,
      fitted,
      remaining,
      bands: agg,
      species,
    };
  });

  return { blocks, feasible: blocks.every((b) => b.remaining === 0) };
}
