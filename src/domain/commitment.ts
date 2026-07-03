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
