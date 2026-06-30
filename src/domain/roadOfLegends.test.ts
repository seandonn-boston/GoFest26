import { describe, expect, it } from "vitest";
import { computeRoadPlan } from "./roadOfLegends";
import { computeBlockPlan, mostOverflowingBlock, sized, type BlockPlan } from "./blockPlan";
import { energyRaidsNeeded } from "./fusionEnergy";
import { DEFAULT_SETTINGS } from "./settings";
import type { BossInput, BossResult, CapacityModel } from "./types";

const capacity: CapacityModel = {
  hoursPerDay: 9,
  days: 2,
  lobbySize: 6,
  battleSecRange: { min: 60, max: 90 },
  catchSec: 100,
  lobbySec: 120,
  transitionSecRange: { min: 15, max: 25 },
  downtimeSecRange: { min: 30, max: 60 },
  raidsPerHour: { min: 4, max: 6 },
  totalRaids: { min: 72, max: 108 },
  quickCatchSlotFactor: 0.5,
  remoteHoursPerDay: 8,
  remoteHours: 16,
  remoteCapacity: { min: 40, max: 60 },
};

const input = (bossId: string): BossInput => ({
  bossId,
  selected: true,
  counts: { standard: 1, shadow: 0, purified: 0 },
  current: { candy: 0, xlCandy: 0, megaEnergy: 0, level: 1, megaLevel: 0 },
  target: { level: 1, megaLevel: 0 },
});

const result = (bossId: string, raids: number): BossResult => ({
  bossId,
  needs: { candy: { needed: raids, raidsRange: { min: raids, max: raids } } },
  raids: { min: raids, max: raids },
  bindingCurrency: "candy",
});

describe("computeRoadPlan", () => {
  it("does nothing when no weekdays are selected", () => {
    const road = computeRoadPlan([input("zekrom")], [result("zekrom", 10)], capacity, DEFAULT_SETTINGS, {});
    expect(road.days).toHaveLength(0);
    expect(road.totalFitted).toBe(0);
    expect(road.headStart).toEqual({});
  });

  it("fits a Monday-featured target into the 2-hour raid hour and reports a head start", () => {
    // Zekrom is on Monday's 5★ roster; Monday is a 2h block (8–12 raids at 4–6/hr).
    const road = computeRoadPlan([input("zekrom")], [result("zekrom", 30)], capacity, DEFAULT_SETTINGS, { mon: true });
    expect(road.days).toHaveLength(1);
    const day = road.days[0];
    expect(day.id).toBe("mon");
    // Monday capacity max = 6/hr × 2h = 12.
    expect(day.capacity.max).toBe(12);
    expect(day.fitted).toBe(12);
    expect(day.remaining).toBe(18); // 30 demanded − 12 fitted
    expect(road.headStart.zekrom).toBe(12);
  });

  it("only counts a target on a day it is actually featured", () => {
    // Tuesday features only Zekrom + Mega Tyranitar — Reshiram is not up.
    const road = computeRoadPlan([input("reshiram")], [result("reshiram", 10)], capacity, DEFAULT_SETTINGS, { tue: true });
    expect(road.days[0].fitted).toBe(0);
    expect(road.headStart.reshiram ?? 0).toBe(0);
  });

  it("excludes region-locked targets (can't be raided in person on a weekday)", () => {
    // Xurkitree is APAC-locked; the default region is not APAC, so it can't be
    // raided in person during a weekday raid hour.
    const road = computeRoadPlan([input("xurkitree")], [result("xurkitree", 10)], capacity, DEFAULT_SETTINGS, { mon: true });
    expect(road.headStart.xurkitree ?? 0).toBe(0);
  });

  it("steers Monday at the most-overflowing weekend block, overriding plain priority", () => {
    // reshiram (Sat 6–9 block, roster #33) vs zacian (Sun 6–9 block, roster #85).
    // Give zacian a far bigger goal so ITS block overflows the most. By plain
    // priority (roster order) Monday would fill reshiram first; the overflow
    // steering must instead spend Monday's whole budget on zacian's block.
    const inputs = [input("reshiram"), input("zacian")];
    const results = [result("reshiram", 8), result("zacian", 40)];

    const baseline = computeBlockPlan(inputs, results, capacity, DEFAULT_SETTINGS, {}, {}, {}, {});
    const worst = mostOverflowingBlock(baseline)!;
    const topOverflow = worst.species.find((s) => s.remaining > 0)!;
    expect(topOverflow.bossId).toBe("zacian"); // sanity: zacian's block overflows most

    const road = computeRoadPlan(inputs, results, capacity, DEFAULT_SETTINGS, { mon: true });
    const monday = road.days[0];
    expect(monday.focus?.blockName).toBe(worst.name);
    expect(road.headStart.zacian).toBe(12); // Monday's full 12-raid budget
    expect(road.headStart.reshiram ?? 0).toBe(0); // not the lower-overflow block
  });

  it("falls back to featured-priority when the worst block has no Monday-raidable overflow", () => {
    // No weekend overflow at all (tiny goal) → no focus, plain featured fill.
    const road = computeRoadPlan([input("zekrom")], [result("zekrom", 5)], capacity, DEFAULT_SETTINGS, { mon: true });
    expect(road.days[0].focus).toBeUndefined();
    expect(road.headStart.zekrom).toBe(5);
  });

  it("mostOverflowingBlock picks the largest remaining, or null when all fit", () => {
    const mk = (name: string, remaining: number): BlockPlan => ({
      day: "sat",
      name,
      startHour: 0,
      endHour: 3,
      capacity: { min: 0, max: 0 },
      demand: 0,
      fitted: 0,
      remaining,
      bands: { blue: 0, green: 0, yellow: 0, red: 0 },
      species: [],
    });
    expect(mostOverflowingBlock({ blocks: [mk("A", 3), mk("B", 9), mk("C", 0)], feasible: false })!.name).toBe("B");
    expect(mostOverflowingBlock({ blocks: [mk("A", 0)], feasible: true })).toBeNull();
  });

  describe("day-locked fusion energy raids count toward the base candy goal", () => {
    const FUSION = { min: 80, max: 140 };
    const safe = { ...DEFAULT_SETTINGS, rewardCase: "safe" as const };
    // White Kyurem (blaze) is featured Tuesday, Black Kyurem (volt) Wednesday.
    const withGoals = (candyRaids: number): { inputs: BossInput[]; results: BossResult[] } => ({
      inputs: [
        {
          ...input("kyurem"),
          energy: {
            blaze: { have: 0, goal: 500, on: true },
            volt: { have: 0, goal: 500, on: true },
          },
        },
      ],
      results: [result("kyurem", candyRaids)],
    });
    // Raids each fusion goal needs at the safe (worst-luck) reward case.
    const perGoal = sized(energyRaidsNeeded(0, 500, FUSION), "safe");

    it("credits the fusion raids toward the head start even though Kyurem isn't featured Tue/Wed", () => {
      const { inputs, results } = withGoals(15);
      const road = computeRoadPlan(inputs, results, capacity, safe, { tue: true, wed: true });
      // Kyurem isn't in Tue/Wed bossIds, so without the fusion credit the head
      // start would be 0; the two fusion goals supply 2 × perGoal candy-effective raids.
      expect(road.headStart.kyurem).toBe(perGoal * 2);
      expect(road.totalFitted).toBe(perGoal * 2);
    });

    it("caps the credit at the species' candy need (extra energy raids don't over-reduce)", () => {
      const candyNeed = perGoal; // less than the 2 × perGoal fusion raids
      const { inputs, results } = withGoals(candyNeed);
      const road = computeRoadPlan(inputs, results, capacity, safe, { tue: true, wed: true });
      expect(road.headStart.kyurem).toBe(candyNeed);
    });

    it("does nothing when the goals are off or their day isn't played", () => {
      const { inputs, results } = withGoals(15);
      const off = computeRoadPlan([input("kyurem")], results, capacity, safe, { tue: true, wed: true });
      expect(off.headStart.kyurem ?? 0).toBe(0);
      // Goals on, but neither Tuesday nor Wednesday is selected → nothing earnable.
      const noDays = computeRoadPlan(inputs, results, capacity, safe, { thu: true });
      expect(noDays.headStart.kyurem ?? 0).toBe(0);
    });

    it("reduces the weekend block demand by the fusion credit", () => {
      const { inputs, results } = withGoals(15);
      const road = computeRoadPlan(inputs, results, capacity, safe, { tue: true, wed: true });
      const weekend = computeBlockPlan(inputs, results, capacity, safe, {}, {}, {}, road.headStart);
      const demanded = weekend.blocks.reduce(
        (sum, b) => sum + b.species.filter((s) => s.bossId === "kyurem").reduce((a, s) => a + s.raids, 0),
        0,
      );
      expect(demanded).toBe(15 - road.headStart.kyurem);
    });
  });

  it("the head start reduces the weekend block demand", () => {
    const inputs = [input("zekrom")];
    const results = [result("zekrom", 30)];
    const road = computeRoadPlan(inputs, results, capacity, DEFAULT_SETTINGS, { mon: true });
    const weekend = computeBlockPlan(
      inputs,
      results,
      capacity,
      DEFAULT_SETTINGS,
      {},
      {},
      {},
      road.headStart,
    );
    // Zekrom is a Saturday Dragonflight Summit boss; its weekend demand should be
    // 30 − 12 (head start) = 18 across the block(s).
    const demanded = weekend.blocks.reduce(
      (sum, b) => sum + b.species.filter((s) => s.bossId === "zekrom").reduce((a, s) => a + s.raids, 0),
      0,
    );
    expect(demanded).toBe(18);
  });
});
