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
    // Raids each fusion goal needs, capped by its 5★ Raid-Hour window (1h × 6/hr = 6):
    // White/Black Kyurem are 5★, so at most 6 fit their 6–7 PM hour each day.
    const perGoal = Math.min(sized(energyRaidsNeeded(0, 500, FUSION), "safe"), 6);

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
    const weekend = computeBlockPlan(inputs, results, capacity, DEFAULT_SETTINGS, {}, {}, {}, road.headStart);
    // Zekrom is a Saturday Dragonflight Summit boss; its weekend demand should be
    // 30 − 12 (head start) = 18 across the block(s).
    const demanded = weekend.blocks.reduce(
      (sum, b) => sum + b.species.filter((s) => s.bossId === "zekrom").reduce((a, s) => a + s.raids, 0),
      0,
    );
    expect(demanded).toBe(18);
  });
});

describe("computeRoadPlan — decoupled (independent RoL targets)", () => {
  const FUSION = { min: 80, max: 140 };

  it("coupled with explicit args equals the default-arg behavior", () => {
    const inputs = [input("zekrom")];
    const results = [result("zekrom", 30)];
    const a = computeRoadPlan(inputs, results, capacity, DEFAULT_SETTINGS, { mon: true });
    const b = computeRoadPlan(inputs, results, capacity, DEFAULT_SETTINGS, { mon: true }, {}, {}, {}, {}, true, {}, {});
    expect(b).toEqual(a);
  });

  it("builds a plan from roadSelected with NO weekend results (no crash) and fills the 5★ hour", () => {
    // Empty weekend inputs/results — zekrom is only a decoupled RoL pick. Tuesday's
    // 5★ window is 1h at 6 raids/hr = 6; the lone 5★ target fills it.
    const road = computeRoadPlan(
      [],
      [],
      capacity,
      DEFAULT_SETTINGS,
      { tue: true },
      {},
      {},
      {},
      {},
      false,
      { zekrom: true },
      {},
    );
    expect(road.days).toHaveLength(1);
    expect(road.days[0].fitted).toBe(6);
    expect(road.headStart.zekrom).toBe(6);
  });

  it("fills the 5★ and Mega windows independently (Tue–Thu Mega is 7–8 PM only)", () => {
    // zekrom is a 5★ (6–7 PM window), mega-tyranitar a Mega (7–8 PM) — each fills its
    // own 1h window (6), neither spilling into the other. Day total = 12.
    const road = computeRoadPlan(
      [],
      [],
      capacity,
      DEFAULT_SETTINGS,
      { tue: true },
      {},
      {},
      {},
      {},
      false,
      {
        zekrom: true,
        "mega-tyranitar": true,
      },
      {},
    );
    expect(road.headStart.zekrom).toBe(6);
    expect(road.headStart["mega-tyranitar"]).toBe(6);
    expect(road.days[0].fitted).toBe(12);
    expect(road.days[0].remaining).toBe(0);
  });

  it("schedules decoupled fusion energy on its locked day, capped by the 5★ hour", () => {
    // White Kyurem (blaze) is a Tuesday 5★ raid; roadEnergy drives it when decoupled,
    // but only the 6-raid 6–7 PM hour can bank it.
    const road = computeRoadPlan(
      [],
      [],
      capacity,
      DEFAULT_SETTINGS,
      { tue: true },
      {},
      {},
      {},
      {},
      false,
      {},
      {
        kyurem: ["blaze"],
      },
    );
    const eRaids = sized(energyRaidsNeeded(0, 1000, FUSION), DEFAULT_SETTINGS.rewardCase);
    expect(road.headStart.kyurem).toBe(Math.min(eRaids, 6));
    // Off its day (only Wednesday played), nothing is earnable.
    const off = computeRoadPlan(
      [],
      [],
      capacity,
      DEFAULT_SETTINGS,
      { wed: true },
      {},
      {},
      {},
      {},
      false,
      {},
      {
        kyurem: ["blaze"],
      },
    );
    expect(off.headStart.kyurem ?? 0).toBe(0);
  });

  it("credits the weekend only for a target that's in BOTH lists", () => {
    // zekrom is a weekend target (30 raids) AND a decoupled RoL pick.
    const inputs = [input("zekrom")];
    const results = [result("zekrom", 30)];
    const road = computeRoadPlan(
      inputs,
      results,
      capacity,
      DEFAULT_SETTINGS,
      { tue: true },
      {},
      {},
      {},
      {},
      false,
      {
        zekrom: true,
      },
      {},
    );
    expect(road.headStart.zekrom).toBe(6);
    const weekend = computeBlockPlan(inputs, results, capacity, DEFAULT_SETTINGS, {}, {}, {}, road.headStart);
    const demanded = weekend.blocks.reduce(
      (sum, b) => sum + b.species.filter((s) => s.bossId === "zekrom").reduce((a, s) => a + s.raids, 0),
      0,
    );
    expect(demanded).toBe(24); // 30 − 6 head start (5★ hour, overlap credited)
  });
});

describe("computeRoadPlan — fusion/primal as reorderable per-day targets", () => {
  const FUSION = { min: 80, max: 140 };
  const safe = { ...DEFAULT_SETTINGS, rewardCase: "safe" as const };
  // White Kyurem (blaze) is a Tuesday 5★ raid; energy raids at the safe reward case.
  // Goal 400 → 5 raids, which fits inside the 6-raid 6–7 PM 5★ hour.
  const eRaids = sized(energyRaidsNeeded(0, 400, FUSION), "safe"); // ceil(400/80) = 5
  const kyuremWith = (goal: number): BossInput => ({
    ...input("kyurem"),
    energy: { blaze: { have: 0, goal, on: true } },
  });

  it("energy raids consume the day's capacity, sit in species, and default to the top", () => {
    // Tuesday 5★ window = 6. Energy (White Kyurem, 5) fills first; Zekrom candy gets 1.
    const inputs = [kyuremWith(400), input("zekrom")];
    const results = [result("kyurem", 30), result("zekrom", 30)];
    const tue = computeRoadPlan(inputs, results, capacity, safe, { tue: true }).days[0];
    const energyRow = tue.species.find((s) => s.energyKey === "blaze");
    expect(energyRow?.bossId).toBe("kyurem");
    expect(energyRow?.fitted).toBe(eRaids); // 5
    expect(tue.species.find((s) => s.bossId === "zekrom" && !s.energyKey)?.fitted).toBe(6 - eRaids); // 1
    expect(tue.fitted).toBe(6); // the 5★ hour is full; the Mega hour is empty
  });

  it("dragging a candy target above the energy item changes what fills the hour", () => {
    const inputs = [kyuremWith(400), input("zekrom")];
    const results = [result("kyurem", 30), result("zekrom", 30)];
    // Explicit order: Zekrom first, then the energy pseudo-id.
    const tue = computeRoadPlan(
      inputs,
      results,
      capacity,
      safe,
      { tue: true },
      {},
      {},
      {},
      {
        tue: ["zekrom", "energy:kyurem:blaze"],
      },
    ).days[0];
    expect(tue.species.find((s) => s.bossId === "zekrom" && !s.energyKey)?.fitted).toBe(6); // Zekrom eats the 5★ hour
    expect(tue.species.find((s) => s.energyKey === "blaze")?.fitted ?? 0).toBe(0); // energy squeezed out
  });

  it("counts energy once in totalFitted (no double vs. the candy pre-credit)", () => {
    const road = computeRoadPlan([kyuremWith(400)], [result("kyurem", 30)], capacity, safe, { tue: true });
    // Only the White Kyurem energy raids happen Tuesday (Kyurem isn't candy-featured Tue).
    expect(road.totalFitted).toBe(eRaids);
    expect(road.headStart.kyurem).toBe(eRaids); // candy credit from the pre-credit
  });

  it("caps a Tue–Thu Mega at its 7–8 PM hour (6), not the full 2h", () => {
    // Mega Tyranitar is a Tuesday Mega; as a big weekend goal it can only be pre-
    // farmed in the 1h Mega window — 6 raids, never the whole 2h block.
    const road = computeRoadPlan([input("mega-tyranitar")], [result("mega-tyranitar", 30)], capacity, safe, { tue: true });
    expect(road.headStart["mega-tyranitar"]).toBe(6);
  });

  it("Thursday yields the Crowned energy raid, not a Hero-forme candy target", () => {
    const zacian: BossInput = { ...input("zacian"), energy: { sword: { have: 0, goal: 400, on: true } } };
    const thu = computeRoadPlan([zacian], [result("zacian", 30)], capacity, safe, { thu: true }).days[0];
    expect(thu.species.some((s) => s.bossId === "zacian" && !s.energyKey)).toBe(false); // no Hero pre-farm
    const crowned = thu.species.find((s) => s.energyKey === "sword");
    expect(crowned?.bossId).toBe("zacian");
    expect(crowned?.fitted).toBe(eRaids);
    // Crowned raids still bank Zacian candy toward the weekend.
    const weekend = computeBlockPlan(
      [zacian],
      [result("zacian", 30)],
      capacity,
      safe,
      {},
      {},
      {},
      computeRoadPlan([zacian], [result("zacian", 30)], capacity, safe, { thu: true }).headStart,
    );
    const demanded = weekend.blocks.reduce(
      (sum, b) => sum + b.species.filter((s) => s.bossId === "zacian").reduce((a, s) => a + s.raids, 0),
      0,
    );
    expect(demanded).toBe(30 - eRaids); // credited
  });
});

describe("computeRoadPlan — pre-credit reconciliation and demand netting (review fixes)", () => {
  const safe = { ...DEFAULT_SETTINGS, rewardCase: "safe" as const };
  const withGoal = (bossId: string, key: string, goal: number): BossInput => ({
    ...input(bossId),
    energy: { [key]: { have: 0, goal, on: true } },
  });

  it("claws back phantom credit when two goals compete for one window (Thursday Crowned pair)", () => {
    // Both Crowned goals want 1000 energy (13 raids each, window-capped to 6), but
    // Thursday's 5★ hour holds 6 TOTAL. Zacian (first in order) banks all 6;
    // Zamazenta's assumed credit must be clawed back — no phantom weekend head start.
    const inputs = [withGoal("zacian", "sword", 1000), withGoal("zamazenta", "shield", 1000)];
    const results = [result("zacian", 30), result("zamazenta", 30)];
    const road = computeRoadPlan(inputs, results, capacity, safe, { thu: true });
    expect(road.headStart.zacian).toBe(6);
    expect(road.headStart.zamazenta ?? 0).toBe(0); // was 6 before the fix
    expect(road.totalFitted).toBe(6);
  });

  it("claws back the credit when the user drags candy above the energy item and squeezes it out", () => {
    const inputs = [withGoal("kyurem", "blaze", 400), input("zekrom")];
    const results = [result("kyurem", 30), result("zekrom", 30)];
    const road = computeRoadPlan(
      inputs,
      results,
      capacity,
      safe,
      { tue: true },
      {},
      {},
      {},
      {
        tue: ["zekrom", "energy:kyurem:blaze"],
      },
    );
    expect(road.headStart.kyurem ?? 0).toBe(0); // energy fit 0 → credit removed
    expect(road.headStart.zekrom).toBe(6);
  });

  it("nets remote allocations out of the weekday demand", () => {
    // 30 Zekrom raids, 25 assigned to remote passes → only 5 need weekday slots.
    const road = computeRoadPlan(
      [input("zekrom")],
      [result("zekrom", 30)],
      capacity,
      { ...safe, useRemoteRaids: true },
      { mon: true },
      {},
      { zekrom: 25 },
    );
    expect(road.headStart.zekrom).toBe(5); // was 12 (full Monday) before the fix
  });

  it("ignores an energy goal left on after its boss was deselected", () => {
    const stale: BossInput = { ...withGoal("kyurem", "blaze", 400), selected: false };
    const road = computeRoadPlan([stale], [result("kyurem", 30)], capacity, safe, { tue: true });
    expect(road.days[0].species.some((s) => s.energyKey === "blaze")).toBe(false);
    expect(road.totalFitted).toBe(0);
  });

  it("decoupled: a per-day deselection re-splits the whole budget to the remaining targets", () => {
    // Both picked overall, but Monday's explicit list keeps only Zekrom → Zekrom
    // gets Monday's whole 12-raid budget instead of a ghost 6/6 split.
    const road = computeRoadPlan([], [], capacity, DEFAULT_SETTINGS, { mon: true }, {}, {}, {}, { mon: ["zekrom"] }, false, {
      zekrom: true,
      reshiram: true,
    });
    expect(road.headStart.zekrom).toBe(12); // was 6 before the fix
    expect(road.headStart.reshiram ?? 0).toBe(0);
    expect(road.days[0].remaining).toBe(0);
  });
});
