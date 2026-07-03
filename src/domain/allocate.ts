// Per-window raid allocation — how a block's (or Road-of-Legends day's) capacity
// is divided among its targets when the player wants more than strict priority.
//
// Six allocation modes mix freely inside one window (see `BlockAllocation`):
//   • fixed    — an exact raid count reserved off the top ("10 Mewtwo").
//   • goal     — a % of THIS target's own required raids, reserved off the top
//                ("80% of its 50-raid goal" → 40 here, the rest in other slots).
//   • floor    — a guaranteed minimum (≥ N) reserved off the top, then it keeps
//                competing (like priority) for more.
//   • ceiling  — a maximum (≤ N); fills like priority but never exceeds N.
//   • share    — a relative weight; share targets split the LEFTOVER time in
//                proportion to their weights (equal weights = an even split),
//                each capped at its real need, freed capacity reflowing.
//   • priority — the default; fills whatever time remains in drag order.
//
// The pass order is reservations (fixed + goal + floor minimums) → share →
// priority/floor/ceiling, so the exact asks and minimums are honoured first,
// shares divide the rest, and the greedy pass soaks up any slack — which keeps
// every window feasible no matter how the pins are set. Every target is bounded
// below by min(i) and above by max(i). Time is measured in slots (a quick-catch
// raid costs < 1 slot), so a "share" is a share of TIME.

import type { BlockAllocation } from "./types";

const modeOf = (a: BlockAllocation | undefined): BlockAllocation["mode"] => a?.mode ?? "priority";
const weightOf = (a: BlockAllocation | undefined): number => (a?.mode === "share" ? Math.max(0, a.weight ?? 1) : 0);
const cnt = (a: BlockAllocation | undefined): number => Math.max(0, Math.round(a?.count ?? 0));

/**
 * Allocate a window's `capSlots` of raid time across targets in drag order.
 * `needs[i]` is target i's remaining need (raids), `costs[i]` its per-raid time
 * cost (1, or the quick-catch factor). Returns the raid count granted to each.
 * With every target on `priority` (the default) this reduces to plain greedy fill,
 * so windows without any pins behave exactly as before.
 */
export function computeAllocation(
  needs: number[],
  costs: number[],
  specs: Array<BlockAllocation | undefined>,
  capSlots: number,
): number[] {
  const n = needs.length;
  const alloc = new Array(n).fill(0);
  let budget = Math.max(0, capSlots);
  const need = (i: number) => Math.max(0, Math.round(needs[i] ?? 0));
  const cost = (i: number) => Math.max(1e-9, costs[i] ?? 1);

  // Upper bound this target may receive in the window (its need, tightened by a
  // fixed/goal/ceiling cap).
  const maxOf = (i: number): number => {
    const s = specs[i];
    const nd = need(i);
    if (s?.mode === "fixed" || s?.mode === "ceiling") return Math.min(nd, cnt(s));
    if (s?.mode === "goal") return Math.min(nd, Math.ceil((Math.min(100, Math.max(0, s.percent ?? 0)) / 100) * nd));
    return nd;
  };
  // Minimum reserved off the top (fixed/goal are exact = their max; floor is ≥ N).
  const minOf = (i: number): number => {
    const s = specs[i];
    if (s?.mode === "fixed" || s?.mode === "goal") return maxOf(i);
    if (s?.mode === "floor") return Math.min(need(i), cnt(s));
    return 0;
  };
  const canAdd = (i: number) => alloc[i] < maxOf(i) && cost(i) <= budget + 1e-9;
  const add = (i: number) => {
    alloc[i] += 1;
    budget -= cost(i);
  };

  // 1. Reservations (fixed + goal exacts, floor minimums), in drag order (a later
  //    reservation may be short-changed if earlier ones spent the window — the
  //    honest outcome, and why unpinned targets go last).
  for (let i = 0; i < n; i++) {
    const want = minOf(i);
    while (alloc[i] < want && canAdd(i)) add(i);
  }

  // 2. Shares split the remaining time by weight. Water-fill one raid at a time to
  //    the share target with the least TIME-per-weight so far (still under its cap
  //    + budget) — weight-proportional time, reflowing a capped-out target's slack.
  const shareIdx = [];
  for (let i = 0; i < n; i++) if (modeOf(specs[i]) === "share" && weightOf(specs[i]) > 0) shareIdx.push(i);
  for (;;) {
    let best = -1;
    let bestRatio = Infinity;
    for (const i of shareIdx) {
      if (!canAdd(i)) continue;
      const ratio = (alloc[i] * cost(i)) / weightOf(specs[i]);
      if (ratio < bestRatio - 1e-9) {
        bestRatio = ratio;
        best = i;
      }
    }
    if (best < 0) break;
    add(best);
  }

  // 3. Priority — and floor/ceiling targets competing for more beyond their
  //    reservation, each still bounded by maxOf — greedy fill in drag order.
  for (let i = 0; i < n; i++) {
    const m = modeOf(specs[i]);
    if (m !== "priority" && m !== "floor" && m !== "ceiling") continue;
    while (canAdd(i)) add(i);
  }

  return alloc;
}

/** True when a window has at least one non-priority pin — i.e. the allocation
 *  engine should run instead of plain greedy fill. */
export function hasPins(specs: Array<BlockAllocation | undefined>): boolean {
  return specs.some((s) => s && s.mode !== "priority");
}
