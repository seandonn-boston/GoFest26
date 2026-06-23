import { ceilDiv } from "@/lib/math";
import type { Range, EnergyGoalDef } from "./types";

/**
 * Raids of the source boss needed to bank `goal` energy given `have` already in
 * hand. Like every other count in the planner this is a range: a raid awards
 * more energy the faster/harder you win, so the best case (most energy/raid →
 * `perRaid.max`) needs the fewest raids and the worst case the most.
 */
export function energyRaidsNeeded(have: number, goal: number, perRaid: Range): Range {
  const need = Math.max(0, goal - Math.max(0, have));
  if (need <= 0) return { min: 0, max: 0 };
  return {
    min: ceilDiv(need, perRaid.max), // best case: most energy per raid
    max: ceilDiv(need, perRaid.min), // worst case: least energy per raid
  };
}

/** Energy still needed to reach the goal (0 once met). */
export function energyRemaining(have: number, goal: number): number {
  return Math.max(0, goal - Math.max(0, have));
}

/** The default goal for an energy when the user first opts in — the fuse/revert cost. */
export function defaultEnergyGoal(def: EnergyGoalDef): number {
  return def.cost;
}
