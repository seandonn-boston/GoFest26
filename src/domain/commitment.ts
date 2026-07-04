// What the plan actually COMMITS to — the raids that fit inside the real time
// windows — as opposed to the raids a 100%-of-goals run would need. Cost and the
// Results pass highlights both key off this: you buy passes for what you'll
// actually do (fitted weekend blocks + Road-of-Legends weekday raids + the
// remote raids you allocated that fit), not for the goals that never fit their
// windows. Remote raids are counted separately because they're ALWAYS bought
// (a trainer holds at most 3 and buys the rest as they go).

import type { WeekendBlockPlan } from "./blockPlan";
import type { RoadPlan } from "./roadOfLegends";

export interface Commitment {
  /** In-person raids the plan commits to: weekend habitat blocks that fit + all
   *  Road-of-Legends weekday raids that fit. These are what owned/free/bought
   *  Premium ("green") passes go toward. */
  inPerson: number;
  /** Remote raids allocated that fit within the remote-time budget. Always
   *  bought — owned passes never cover these. */
  remote: number;
  /** inPerson + remote — every raid the plan actually intends to do. */
  total: number;
  /** Weekend habitat blocks only (subset of `inPerson`). */
  weekendInPerson: number;
  /** Road-of-Legends weekdays only (subset of `inPerson`). */
  roadInPerson: number;
}

/**
 * Sum the raids that actually fit across the weekend blocks, the Road-of-Legends
 * weekday windows, and the remote pool. Remote raids are already pulled OUT of
 * the weekend blocks upstream, so there's no double counting.
 */
export function computeCommitment(weekend: WeekendBlockPlan, road: RoadPlan): Commitment {
  const weekendInPerson = weekend.blocks.reduce((n, b) => n + Math.max(0, b.fitted), 0);
  const roadInPerson = Math.max(0, road.totalFitted);
  const remote = Math.max(0, weekend.remote?.fitted ?? 0);
  const inPerson = weekendInPerson + roadInPerson;
  return { inPerson, remote, total: inPerson + remote, weekendInPerson, roadInPerson };
}

export interface CommitmentByBoss {
  /** Per-boss in-person raids the plan commits to (weekend habitat blocks that
   *  fit + Road-of-Legends weekday raids that fit), keyed by the primary bossId. */
  inPerson: Record<string, number>;
  /** Per-boss remote raids allocated that fit, keyed by primary bossId. */
  remote: Record<string, number>;
}

const addTo = (rec: Record<string, number>, id: string, n: number) => {
  if (n > 0) rec[id] = (rec[id] ?? 0) + n;
};

/**
 * Break the committed raids down per boss so the Cost step can price the passes a
 * plan actually intends to buy (rather than the full 100%-of-goals demand). RoL
 * in-person credit comes from `headStart` (the reconciled per-boss fitted count);
 * weekend blocks and the remote pool sum their species' `fitted`.
 */
export function commitmentByBoss(weekend: WeekendBlockPlan, road: RoadPlan): CommitmentByBoss {
  const inPerson: Record<string, number> = {};
  const remote: Record<string, number> = {};
  for (const block of weekend.blocks) {
    for (const s of block.species) addTo(inPerson, s.bossId, s.fitted);
  }
  for (const [bossId, fitted] of Object.entries(road.headStart)) addTo(inPerson, bossId, fitted);
  for (const s of weekend.remote?.species ?? []) addTo(remote, s.bossId, s.fitted);
  return { inPerson, remote };
}
