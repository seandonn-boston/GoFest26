import { describe, expect, it } from "vitest";
import { computeCommitment, commitmentByBoss } from "./commitment";
import type { WeekendBlockPlan } from "./blockPlan";
import type { RoadPlan } from "./roadOfLegends";

const block = (fitted: number, remaining = 0, species: { bossId: string; fitted: number }[] = []) =>
  ({ fitted, remaining, species }) as unknown as WeekendBlockPlan["blocks"][number];

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

describe("commitmentByBoss", () => {
  const weekendWith = (
    species: { bossId: string; fitted: number }[],
    remoteSpecies: { bossId: string; fitted: number }[] = [],
  ): WeekendBlockPlan =>
    ({
      blocks: [
        block(
          species.reduce((n, s) => n + s.fitted, 0),
          0,
          species,
        ),
      ],
      remote: remoteSpecies.length
        ? ({ fitted: remoteSpecies.reduce((n, s) => n + s.fitted, 0), species: remoteSpecies } as unknown)
        : undefined,
      feasible: true,
    }) as WeekendBlockPlan;

  const roadWith = (
    days: { species: { bossId: string; fitted: number; energyKey?: string }[] }[],
    headStart: Record<string, number> = {},
  ): RoadPlan => {
    const totalFitted = days.reduce((n, d) => n + d.species.reduce((m, s) => m + s.fitted, 0), 0);
    return { days, headStart, totalFitted } as unknown as RoadPlan;
  };

  it("bills RoL raids from the fitted day plans, NOT the candy-credit headStart", () => {
    // Regression: 6 White Kyurem ENERGY raids fit Tuesday, but Kyurem's weekend
    // candy need is only 2, so headStart carried a credit of 2. Billing from
    // headStart made the Cost step charge 2 passes while the Results step (via
    // totalFitted) counted 6 — the "buy 23 vs buy 0" mismatch. Every raid done
    // costs a pass, so the per-boss bill must read the day plans: 6, not 2.
    const plan = roadWith(
      [{ species: [{ bossId: "kyurem", fitted: 6, energyKey: "blaze" }] }],
      { kyurem: 2 }, // reconciled candy credit — smaller than the raids done
    );
    const c = commitmentByBoss(weekendWith([]), plan);
    expect(c.inPerson.kyurem).toBe(6);
  });

  it("per-boss totals sum to computeCommitment's aggregates (steps stay in agreement)", () => {
    const wk = weekendWith(
      [
        { bossId: "zekrom", fitted: 5 },
        { bossId: "reshiram", fitted: 3 },
      ],
      [{ bossId: "xurkitree", fitted: 4 }],
    );
    const rd = roadWith(
      [{ species: [{ bossId: "zekrom", fitted: 4 }] }, { species: [{ bossId: "kyurem", fitted: 6, energyKey: "blaze" }] }],
      { zekrom: 4, kyurem: 1 },
    );
    const byBoss = commitmentByBoss(wk, rd);
    const agg = computeCommitment(wk, rd);
    const sumIn = Object.values(byBoss.inPerson).reduce((a, b) => a + b, 0);
    const sumRemote = Object.values(byBoss.remote).reduce((a, b) => a + b, 0);
    expect(sumIn).toBe(agg.inPerson); // 8 weekend + 10 road
    expect(sumRemote).toBe(agg.remote); // 4
    expect(byBoss.inPerson.zekrom).toBe(9); // 5 weekend + 4 road
  });
});
