import { describe, expect, it } from "vitest";
import { getBoss } from "@/data";
import { GAME_CONFIG } from "@/data/config";
import { makeDefaultInput } from "./defaults";
import { computeBossResult } from "./raidsNeeded";
import { computeCapacity } from "./capacity";
import { computeNetNeed } from "./requirements";
import { computeSchedule } from "./scheduler";
import { DEFAULT_SETTINGS, type PlannerSettings } from "./settings";
import { computePlanSummary } from "./index";
import type { BossInput } from "./types";

function planningPerHour() {
  const cap = computeCapacity();
  return Math.max(1, Math.round((cap.raidsPerHour.min + cap.raidsPerHour.max) / 2));
}

function scheduleFor(inputs: BossInput[], settings: PlannerSettings = DEFAULT_SETTINGS) {
  const cap = computeCapacity(settings);
  const results = inputs
    .filter((i) => i.selected)
    .map((i) => computeBossResult(getBoss(i.bossId)!, i));
  return computeSchedule(inputs, results, cap, settings);
}

const mewtwoX = getBoss("mega-mewtwo-x")!;
const reshiram = getBoss("reshiram")!;

function input(bossId: string, overrides: Partial<BossInput["current"]> & { targetMegaLevel?: number; targetLevel?: number } = {}): BossInput {
  const base = makeDefaultInput(getBoss(bossId)!);
  return {
    ...base,
    current: { ...base.current, ...overrides },
    target: {
      level: overrides.targetLevel ?? base.target.level,
      megaLevel: overrides.targetMegaLevel ?? base.target.megaLevel,
    },
  };
}

describe("requirements", () => {
  it("clamps net need at zero when you already have enough", () => {
    const net = computeNetNeed(reshiram, input("reshiram", { xlCandy: 9999, level: 40, targetLevel: 50 }));
    expect(net.xlCandy).toBe(0);
  });

  it("computes full XL need for a standard 40->50 climb", () => {
    const net = computeNetNeed(reshiram, input("reshiram", { level: 40, targetLevel: 50 }));
    expect(net.xlCandy).toBe(GAME_CONFIG.xlToLevel50.standard); // 296
  });

  it("scales XL linearly for a partial 45->50 climb", () => {
    const net = computeNetNeed(reshiram, input("reshiram", { level: 45, targetLevel: 50 }));
    expect(net.xlCandy).toBe(Math.round(GAME_CONFIG.xlToLevel50.standard / 2)); // 148
  });

  it("waives the first-evolution cost for GO Fest pre-unlocked Mewtwo", () => {
    // current mega level 0, but pre-unlocked => effective start is level 1 (7,500 waived)
    const net = computeNetNeed(mewtwoX, input("mega-mewtwo-x", { megaLevel: 0, targetMegaLevel: 4 }));
    const totals = mewtwoX.megaLevelEnergyTotals!;
    expect(net.megaEnergy).toBe(totals[4] - totals[1]); // 18580 - 7500 = 11080
  });
});

describe("raidsNeeded", () => {
  it("never needs more raids with the mega-buddy boost than without", () => {
    const result = computeBossResult(reshiram, input("reshiram", { level: 40, targetLevel: 50 }));
    expect(result.raidsWithBoost.min).toBeLessThanOrEqual(result.raidsNoBoost.min);
    expect(result.raidsWithBoost.max).toBeLessThanOrEqual(result.raidsNoBoost.max);
  });

  it("uses Super Mega energy rewards to size Mewtwo raids", () => {
    // Isolate the mega-energy goal (no leveling) so Mega Energy is the constraint.
    const result = computeBossResult(
      mewtwoX,
      input("mega-mewtwo-x", { megaLevel: 0, targetMegaLevel: 4, level: 40, targetLevel: 40 }),
    );
    const need = 18580 - 7500; // 11080
    const { min, max } = GAME_CONFIG.megaRewards.superMega;
    expect(result.bindingCurrency).toBe("megaEnergy");
    expect(result.raidsNoBoost.min).toBe(Math.ceil(need / max));
    expect(result.raidsNoBoost.max).toBe(Math.ceil(need / min));
  });

  it("returns zero raids when nothing is needed", () => {
    const result = computeBossResult(reshiram, input("reshiram", { xlCandy: 9999, level: 40, targetLevel: 50 }));
    expect(result.raidsNoBoost).toEqual({ min: 0, max: 0 });
    expect(result.bindingCurrency).toBeNull();
  });
});

describe("capacity", () => {
  it("derives raids/hour and weekend totals from timing config", () => {
    const cap = computeCapacity();
    const { raidDurationSec, downtimeSecRange } = GAME_CONFIG.capacity;
    expect(cap.raidsPerHour.max).toBe(Math.floor(3600 / (raidDurationSec + downtimeSecRange.min)));
    expect(cap.totalRaids.max).toBe(cap.raidsPerHour.max * cap.hoursPerDay * cap.days);
  });
});

describe("scheduler", () => {
  it("places exactly the demanded number of all-weekend Mewtwo raids (no overshoot)", () => {
    const mewtwo = input("mega-mewtwo-x", { megaLevel: 0, targetMegaLevel: 4, level: 40, targetLevel: 40 });
    const result = computeBossResult(mewtwoX, mewtwo);
    const expectedDemand = Math.ceil((result.raidsNoBoost.min + result.raidsNoBoost.max) / 2);

    const schedule = scheduleFor([mewtwo]);
    const placed = schedule.raids.filter((r) => r.bossId === "mega-mewtwo-x").length;
    expect(placed).toBe(expectedDemand);
    expect(schedule.feasible).toBe(true);
  });

  it("only places a windowed boss inside its habitat windows", () => {
    // Reshiram is only available Saturday hours 0–3.
    const resh = input("reshiram", { level: 40, targetLevel: 50 });
    const schedule = scheduleFor([resh]);
    const reshRaids = schedule.raids.filter((r) => r.bossId === "reshiram");
    expect(reshRaids.length).toBeGreaterThan(0);
    for (const r of reshRaids) {
      expect(r.day).toBe("sat");
      expect(r.hour).toBeGreaterThanOrEqual(0);
      expect(r.hour).toBeLessThan(3);
    }
  });

  it("flags an unmet goal when a windowed boss needs more raids than its windows allow", () => {
    const resh = input("reshiram", { level: 40, targetLevel: 50 }); // needs ~111 raids
    const schedule = scheduleFor([resh]);
    const windowSlots = 3 * planningPerHour(); // 3 available hours
    const placed = schedule.raids.length;
    expect(placed).toBe(windowSlots);
    expect(schedule.feasible).toBe(false);
    expect(schedule.unmetGoals[0]?.bossId).toBe("reshiram");
  });

  it("recommends a type-matching mega buddy when one is selected", () => {
    // Mega Salamence (Dragon/Flying) can boost Reshiram (Dragon/Fire) raids.
    const resh = input("reshiram", { level: 40, targetLevel: 50 });
    const sala = input("mega-salamence", { megaLevel: 1, targetMegaLevel: 3 });
    const schedule = scheduleFor([resh, sala]);
    const reshRaid = schedule.raids.find((r) => r.bossId === "reshiram");
    expect(reshRaid?.recommendedBuddyMegaId).toBe("mega-salamence");
  });
});

describe("settings", () => {
  it("derives raids/hour from custom raid timing", () => {
    const settings: PlannerSettings = {
      ...DEFAULT_SETTINGS,
      raidDurationSec: 120,
      downtimeSecRange: { min: 0, max: 0 },
    };
    const cap = computeCapacity(settings);
    expect(cap.raidsPerHour.max).toBe(30); // 3600 / 120
    expect(cap.totalRaids.max).toBe(30 * cap.hoursPerDay * cap.days);
  });

  it("schedules more raids in worst-case than best-case reward planning", () => {
    const resh = input("reshiram", { level: 40, targetLevel: 50 });
    const safe = scheduleFor([resh], { ...DEFAULT_SETTINGS, rewardCase: "safe" });
    const optimistic = scheduleFor([resh], { ...DEFAULT_SETTINGS, rewardCase: "optimistic" });
    expect(safe.raids.length).toBeGreaterThanOrEqual(optimistic.raids.length);
  });
});

describe("computePlanSummary", () => {
  it("ignores unselected bosses and aggregates the rest", () => {
    const a = input("mega-mewtwo-x", { megaLevel: 0, targetMegaLevel: 4 });
    const b = { ...input("reshiram", { level: 40, targetLevel: 50 }), selected: false };
    const summary = computePlanSummary([a, b]);
    expect(summary.results).toHaveLength(1);
    expect(summary.results[0].bossId).toBe("mega-mewtwo-x");
  });
});
