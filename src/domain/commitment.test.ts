import { describe, expect, it } from "vitest";
import { computeCommitment } from "./commitment";
import type { WeekendBlockPlan } from "./blockPlan";
import type { RoadPlan } from "./roadOfLegends";

const block = (fitted: number, remaining = 0) => ({ fitted, remaining }) as WeekendBlockPlan["blocks"][number];

const weekend = (blocks: number[], remoteFitted?: number): WeekendBlockPlan => ({
  blocks: blocks.map((f) => block(f)),
  remote: remoteFitted === undefined ? undefined : ({ fitted: remoteFitted } as WeekendBlockPlan["remote"]),
  feasible: true,
});

const road = (totalFitted: number): RoadPlan => ({ days: [], headStart: {}, totalFitted }) as unknown as RoadPlan;

describe("computeCommitment", () => {
  it("sums weekend + road in-person raids and tracks remote separately", () => {
    const c = computeCommitment(weekend([5, 3], 4), road(6));
    expect(c.weekendInPerson).toBe(8);
    expect(c.roadInPerson).toBe(6);
    expect(c.inPerson).toBe(14);
    expect(c.remote).toBe(4);
    expect(c.total).toBe(18);
  });

  it("treats a missing remote pool as zero remote commitment", () => {
    const c = computeCommitment(weekend([2, 2]), road(0));
    expect(c.remote).toBe(0);
    expect(c.inPerson).toBe(4);
    expect(c.total).toBe(4);
  });

  it("never goes negative on empty plans", () => {
    const c = computeCommitment(weekend([]), road(0));
    expect(c).toEqual({ inPerson: 0, remote: 0, total: 0, weekendInPerson: 0, roadInPerson: 0 });
  });
});
