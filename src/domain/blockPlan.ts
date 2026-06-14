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
import { HABITATS, blockKey } from "@/data/habitats";
import { collapseForms, planningWindows, remoteCapFor, formeInBlock } from "./forms";
import { midpoint } from "@/lib/math";
import { bossIsLocal } from "./region";
import { DEFAULT_SETTINGS, MAX_REMOTE_PER_SPECIES, type PlannerSettings } from "./settings";
import type { BossInput, BossResult, CapacityModel, EventDay, HabitatWindow, RaidBoss, Range } from "./types";

export type RiskBand = "blue" | "green" | "yellow" | "red";

/** Render/stack order, safest → least certain. */
export const RISK_BANDS: readonly RiskBand[] = ["blue", "green", "yellow", "red"];

const emptyBands = (): Record<RiskBand, number> => ({ blue: 0, green: 0, yellow: 0, red: 0 });

export interface BlockSpeciesShare {
  bossId: string;
  bossName: string;
  /** For a multi-form species, the specific forme available in THIS block (its
   *  name/sprite/counters); bossId stays the shared primary for result linkage. */
  formeBossId?: string;
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

/**
 * The Remote Raid pool — a separate, non-time-blocked allocation the user opts
 * into. Region-locked targets (which can't be raided in person at all) come
 * first by priority, then block shortfalls, then leftover passes spill into
 * Mewtwo. `capacity` is the pool size (the bar's 100%).
 */
export interface RemotePlan {
  capacity: number;
  demand: number;
  fitted: number;
  remaining: number;
  bands: Record<RiskBand, number>;
  species: BlockSpeciesShare[];
}

export interface WeekendBlockPlan {
  blocks: BlockPlan[];
  /** Remote-raid pool, present only when the user opted into remote raids. */
  remote?: RemotePlan;
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
  formeBossId?: string;
  raids: number;
  range: Range;
  mewtwo: boolean;
}

/** Order shares by a priority-rank function (highest first); ties → fixed
 *  species before Mewtwo, then roster order. Used by the global remote pool. */
function orderByPriority(shares: RawShare[], priorityOf: (id: string) => number): RawShare[] {
  return [...shares].sort((a, z) => {
    const pa = priorityOf(a.bossId);
    const pz = priorityOf(z.bossId);
    if (pa !== pz) return pa - pz;
    if (a.mewtwo !== z.mewtwo) return a.mewtwo ? 1 : -1;
    return (getBoss(a.bossId)?.sortPriority ?? 0) - (getBoss(z.bossId)?.sortPriority ?? 0);
  });
}

/** Order a block's shares by that block's explicit priority list (highest
 *  first); ids not listed fall back to fixed-species-before-Mewtwo, then roster. */
function orderByBlock(shares: RawShare[], order: string[]): RawShare[] {
  const rank = new Map(order.map((id, i) => [id, i] as const));
  const rankOf = (id: string) => rank.get(id) ?? Infinity;
  return [...shares].sort((a, z) => {
    const pa = rankOf(a.bossId);
    const pz = rankOf(z.bossId);
    if (pa !== pz) return pa - pz;
    if (a.mewtwo !== z.mewtwo) return a.mewtwo ? 1 : -1;
    return (getBoss(a.bossId)?.sortPriority ?? 0) - (getBoss(z.bossId)?.sortPriority ?? 0);
  });
}

/**
 * A single global priority sequence derived from the per-block orders — blocks
 * in chronological order, each block's ranked ids in turn (deduped). Used by the
 * remote-raid pool, which is event-wide and has no single block of its own.
 */
export function globalPriorityFromBlocks(blockPriority: Record<string, string[]>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const h of HABITATS) {
    for (const id of blockPriority[blockKey(h.day, h.startHour)] ?? []) {
      if (!seen.has(id)) {
        seen.add(id);
        out.push(id);
      }
    }
  }
  return out;
}

/** Fill an ordered share list into a capacity, banding the part that fits and
 *  reporting the rest as shortfall. Shared by the habitat blocks and the remote pool. */
function fillShares(
  ordered: RawShare[],
  cap: Range,
): { species: BlockSpeciesShare[]; demand: number; fitted: number; remaining: number; bands: Record<RiskBand, number> } {
  let cum = 0;
  let fitted = 0;
  let remaining = 0;
  const agg = emptyBands();
  const species = ordered.map((sh) => {
    const fit = Math.max(0, Math.min(sh.raids, cap.max - cum));
    const bands = bandsForSpecies(fit, sh.raids, sh.range, cum, cap);
    cum += sh.raids;
    fitted += fit;
    remaining += sh.raids - fit;
    for (const k of RISK_BANDS) agg[k] += bands[k];
    return {
      bossId: sh.bossId,
      bossName: sh.bossName,
      formeBossId: sh.formeBossId,
      raids: sh.raids,
      range: sh.range,
      fitted: fit,
      remaining: sh.raids - fit,
      bands,
      mewtwo: sh.mewtwo,
    };
  });
  return { species, demand: cum, fitted, remaining, bands: agg };
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
  blockPriority: Record<string, string[]> = {},
  mewtwoTargets: Record<string, boolean> = {},
  remoteAllocations: Record<string, number> = {},
): WeekendBlockPlan {
  const rewardCase = settings.rewardCase;
  // Multi-form species collapse to one shared-resource target (primary forme),
  // matching the collapsed results from computePlanSummary.
  inputs = collapseForms(inputs);
  // Remote raids the user assigned to each species reduce that species' in-person
  // (time-block) demand — only the non-remote remainder needs to fit a block.
  const remoteFor = (id: string) => (settings.useRemoteRaids ? Math.max(0, Math.round(remoteAllocations[id] ?? 0)) : 0);
  const rpH = capacity.raidsPerHour;
  const resultById = new Map(results.map((r) => [r.bossId, r]));
  const inputById = new Map(inputs.map((i) => [i.bossId, i]));
  const isMewtwo = (id: string) => id === MEWTWO_X_ID || id === MEWTWO_Y_ID;
  // A Mewtwo form is hunted in a block unless its checkbox was explicitly cleared
  // (default-on for every eligible — day-matching, selected — block).
  const keyAt = (i: number) => blockKey(HABITATS[i].day, HABITATS[i].startHour);
  const targeted = (formId: string, i: number) => mewtwoTargets[`${formId}@${keyAt(i)}`] !== false;

  const shares: RawShare[][] = HABITATS.map(() => []);
  const capacities: Range[] = HABITATS.map((h) => ({
    min: rpH.min * (h.endHour - h.startHour),
    max: rpH.max * (h.endHour - h.startHour),
  }));

  const localOf = (boss: RaidBoss) => bossIsLocal(boss, settings.region);

  // 1. Fixed-window LOCAL species → their habitat block(s). Region-locked bosses
  //    can't be raided in person during the event, so they're held back for the
  //    remote pool below. A boss spanning several blocks is split evenly (in
  //    practice each occupies exactly one block).
  for (const input of inputs) {
    if (!input.selected || isMewtwo(input.bossId)) continue;
    const boss = getBoss(input.bossId);
    const res = resultById.get(input.bossId);
    if (!boss || !res || !localOf(boss)) continue;
    const total = sized(res.raids, rewardCase);
    if (total <= 0) continue;
    // What's left after the user does some of this species remotely.
    const blockTotal = Math.max(0, total - remoteFor(boss.id));
    if (blockTotal <= 0) continue;
    const scale = blockTotal / total; // shrink the candy-luck range to the in-person portion
    // A shared-resource multi-form species (Dialga, Palkia, …) spreads its one
    // pool across every block any forme appears in — possibly both days.
    const idxs = blockIndicesForWindows(planningWindows(boss));
    if (!idxs.length) continue;
    idxs.forEach((bi, k) => {
      const share = Math.floor(blockTotal / idxs.length) + (k < blockTotal % idxs.length ? 1 : 0);
      if (share <= 0) return;
      const frac = (share / blockTotal) * scale;
      // Show the forme actually available in this block (Origin Forme Dialga on
      // Sunday); bossId stays the shared primary so results/progress still link.
      const forme = formeInBlock(boss, HABITATS[bi]);
      shares[bi].push({
        bossId: boss.id,
        bossName: forme.name,
        formeBossId: forme.id,
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

  const satEnergy = xSel ? sized(xRes?.needs.megaEnergy?.raidsRange, rewardCase) : 0;
  const sunEnergy = ySel ? sized(yRes?.needs.megaEnergy?.raidsRange, rewardCase) : 0;
  // Each Mewtwo raid yields both Candy and XL, so the shared leveling demands the
  // larger of the two; the part beyond the day-locked energy raids is flexible.
  // The shared Candy/XL/level lives on whichever form owns it (X when selected,
  // else Y), so read leveling from that form — otherwise a Sunday-only Mewtwo Y
  // would drop its entire leveling demand.
  const levelRes = xSel ? xRes : yRes;
  const sharedLevel = (xSel || ySel)
    ? Math.max(sized(levelRes?.needs.xlCandy?.raidsRange, rewardCase), sized(levelRes?.needs.candy?.raidsRange, rewardCase))
    : 0;
  const fluidNeed = Math.max(0, sharedLevel - satEnergy - sunEnergy);

  // Mewtwo remote raids first cover that form's day-locked energy, then spill into
  // the shared flexible pool — reducing what Mewtwo needs from the time blocks.
  const allocX = remoteFor(MEWTWO_X_ID);
  const allocY = remoteFor(MEWTWO_Y_ID);
  const satLocked = Math.max(0, satEnergy - allocX);
  const sunLocked = Math.max(0, sunEnergy - allocY);
  const fluid = Math.max(0, fluidNeed - Math.max(0, allocX - satEnergy) - Math.max(0, allocY - sunEnergy));

  const ratioFor = (res: BossResult | undefined): Range => {
    const e = sized(res?.raids, rewardCase);
    if (!res || e <= 0) return { min: 1, max: 1 };
    return { min: res.raids.min / e, max: res.raids.max / e };
  };
  const xRatio = ratioFor(xRes);
  const yRatio = ratioFor(yRes);

  // Mewtwo only flows into blocks the user is targeting it in (day-locked: X on
  // Saturday, Y on Sunday). Energy is day-specific; the shared leveling fluid can
  // fall on any targeted block.
  const satIdx = HABITATS.map((h, i) => (h.day === "sat" && xSel && targeted(MEWTWO_X_ID, i) ? i : -1)).filter((i) => i >= 0);
  const sunIdx = HABITATS.map((h, i) => (h.day === "sun" && ySel && targeted(MEWTWO_Y_ID, i) ? i : -1)).filter((i) => i >= 0);
  const allIdx = [...satIdx, ...sunIdx];

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

  // 3. Order each block by ITS OWN priority list and fill to 100% (the tail is cut
  //    when over capacity). Default tie-break: fixed species before Mewtwo, then
  //    roster order.
  const blocks: BlockPlan[] = HABITATS.map((h, i) => ({
    day: h.day,
    name: h.name,
    startHour: h.startHour,
    endHour: h.endHour,
    capacity: capacities[i],
    ...fillShares(orderByBlock(shares[i], blockPriority[keyAt(i)] ?? []), capacities[i]),
  }));

  // 4. Remote-raid pool (opt-in): the per-species counts the user assigned, shown
  //    against the 60-pass budget. Ordered by a global priority derived from the
  //    per-block lists. These already reduced the block demand above.
  const globalOrder = globalPriorityFromBlocks(blockPriority);
  const remoteRank = new Map(globalOrder.map((id, i) => [id, i] as const));
  const remotePriorityOf = (id: string) => remoteRank.get(id) ?? Infinity;
  const remote = settings.useRemoteRaids
    ? computeRemotePlan(inputs, resultById, rewardCase, remotePriorityOf, remoteAllocations, settings.remoteRaidBudget)
    : undefined;

  return { blocks, remote, feasible: blocks.every((b) => b.remaining === 0) };
}

/**
 * Rare Candy / Rare Candy XL the plan's raids will hand out (species-agnostic,
 * on top of each boss's own candy/energy). Every raid drops ~1 Rare Candy; every
 * 5★, regional, or super-mega (Mewtwo) raid also drops ~1 Rare Candy XL —
 * regular Mega raids don't. Counts the raids that actually fit, blocks + remote.
 */
export function rareCandyForecast(plan: WeekendBlockPlan): { rareCandy: number; rareCandyXl: number } {
  let rareCandy = 0;
  let rareCandyXl = 0;
  const tally = (species: BlockSpeciesShare[]) => {
    for (const s of species) {
      rareCandy += s.fitted;
      if (getBoss(s.bossId)?.tier !== "mega") rareCandyXl += s.fitted; // 5★/regional/super-mega only
    }
  };
  for (const b of plan.blocks) tally(b.species);
  if (plan.remote) tally(plan.remote.species);
  return { rareCandy, rareCandyXl };
}

export interface GoalProgress {
  /** Raids you can actually fit (in person + remote). */
  achievable: number;
  /** Raids your goals require in total. */
  required: number;
  /** Per-boss { achievable, required }. */
  bySpecies: Record<string, { achievable: number; required: number }>;
}

/**
 * How much of every goal the plan can actually cover: achievable raids (what
 * fits, in person + remote) over required raids (the goal's full size, from the
 * results — so region-locked targets count their whole goal, not just what's
 * been assigned remotely). A clean fraction rather than a probability, so partial
 * progress always shows — totalled for the headline and broken out per species.
 */
export function goalProgress(
  plan: WeekendBlockPlan,
  results: BossResult[],
  settings: PlannerSettings = DEFAULT_SETTINGS,
): GoalProgress {
  const fittedById = new Map<string, number>();
  const add = (s: BlockSpeciesShare) => fittedById.set(s.bossId, (fittedById.get(s.bossId) ?? 0) + s.fitted);
  for (const b of plan.blocks) for (const s of b.species) add(s);
  if (plan.remote) for (const s of plan.remote.species) add(s);

  const bySpecies: Record<string, { achievable: number; required: number }> = {};
  let achievable = 0;
  let required = 0;
  for (const res of results) {
    const need = sized(res.raids, settings.rewardCase);
    if (need <= 0) continue;
    const got = Math.min(need, fittedById.get(res.bossId) ?? 0);
    bySpecies[res.bossId] = { achievable: got, required: need };
    achievable += got;
    required += need;
  }
  return { achievable, required, bySpecies };
}

/**
 * Auto-fill remote allocations the moment the user opts in: cover the goals that
 * can't be met in person — region-locked targets (their full goal) and any block
 * shortfalls — filled by priority within the 60-pass budget and per-species caps.
 * `plan` should be the current (remote-off) plan so its shortfalls are accurate.
 */
export function autoRemoteAllocations(
  plan: WeekendBlockPlan,
  inputs: BossInput[],
  results: BossResult[],
  settings: PlannerSettings,
  priorityOrder: string[],
): Record<string, number> {
  const rewardCase = settings.rewardCase;
  // Multi-form species collapse to one shared-resource target (primary forme).
  inputs = collapseForms(inputs);
  const resultById = new Map(results.map((r) => [r.bossId, r]));
  const rank = new Map(priorityOrder.map((id, i) => [id, i] as const));
  const priorityOf = (id: string) => rank.get(id) ?? Infinity;
  const isMewtwo = (id: string) => id === MEWTWO_X_ID || id === MEWTWO_Y_ID;

  const shortfall = new Map<string, number>();
  for (const b of plan.blocks) {
    for (const s of b.species) {
      if (s.remaining > 0) shortfall.set(s.bossId, (shortfall.get(s.bossId) ?? 0) + s.remaining);
    }
  }

  const needs = inputs
    .filter((i) => i.selected)
    .map((i) => getBoss(i.bossId))
    .filter((b): b is RaidBoss => !!b)
    .map((b) => ({
      id: b.id,
      need: bossIsLocal(b, settings.region) ? shortfall.get(b.id) ?? 0 : sized(resultById.get(b.id)?.raids, rewardCase),
      mewtwo: isMewtwo(b.id),
    }))
    .filter((n) => n.need > 0)
    .sort((a, z) => {
      const pa = priorityOf(a.id);
      const pz = priorityOf(z.id);
      if (pa !== pz) return pa - pz;
      if (a.mewtwo !== z.mewtwo) return a.mewtwo ? 1 : -1;
      return (getBoss(a.id)?.sortPriority ?? 0) - (getBoss(z.id)?.sortPriority ?? 0);
    });

  const out: Record<string, number> = {};
  let budget = settings.remoteRaidBudget;
  for (const n of needs) {
    if (budget <= 0) break;
    const boss = getBoss(n.id);
    const cap = boss ? remoteCapFor(boss, settings.remoteRaidBudget) : Math.min(MAX_REMOTE_PER_SPECIES, settings.remoteRaidBudget);
    const give = Math.min(n.need, cap, budget);
    if (give > 0) {
      out[n.id] = give;
      budget -= give;
    }
  }
  return out;
}

/**
 * Build the remote-raid pool from the per-species counts the user assigned. Each
 * share is exactly what they allocated (its candy-luck range scaled to that
 * count); the bar shows the assignments against the 60-pass budget.
 */
function computeRemotePlan(
  inputs: BossInput[],
  resultById: Map<string, BossResult>,
  rewardCase: PlannerSettings["rewardCase"],
  priorityOf: (id: string) => number,
  remoteAllocations: Record<string, number>,
  budget: number,
): RemotePlan | undefined {
  const shares: RawShare[] = [];
  for (const input of inputs) {
    if (!input.selected) continue;
    const alloc = Math.max(0, Math.round(remoteAllocations[input.bossId] ?? 0));
    if (alloc <= 0) continue;
    const boss = getBoss(input.bossId);
    if (!boss) continue;
    const res = resultById.get(input.bossId);
    const total = sized(res?.raids, rewardCase);
    const range =
      res && total > 0
        ? { min: Math.round((alloc * res.raids.min) / total), max: Math.round((alloc * res.raids.max) / total) }
        : { min: alloc, max: alloc };
    shares.push({
      bossId: boss.id,
      bossName: boss.name,
      raids: alloc,
      range,
      mewtwo: boss.id === MEWTWO_X_ID || boss.id === MEWTWO_Y_ID,
    });
  }
  if (!shares.length) return undefined;
  const ordered = orderByPriority(shares, priorityOf);
  return { capacity: budget, ...fillShares(ordered, { min: budget, max: budget }) };
}
