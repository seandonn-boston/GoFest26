import { describe, expect, it } from "vitest";
import { computeRoadPlan } from "./roadOfLegends";
import { computeBlockPlan } from "./blockPlan";
import { DEFAULT_SETTINGS } from "./settings";
import type { BossInput, BossResult, CapacityModel } from "./types";

const capacity: CapacityModel = {
  hoursPerDay: 9,
  days: 2,
  lobbySize: 6,
  battleSecRange: { min: 60, max: 90 },
  catchSec: 100,
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
