import { describe, expect, it } from "vitest";
import { computeBossResult, isL4Eligible, xlBoostFactor } from "./raidsNeeded";
import { getBoss } from "@/data";
import type { BossInput } from "./types";

const input = (bossId: string, target: Partial<BossInput["target"]> = {}): BossInput => ({
  bossId,
  selected: true,
  counts: { standard: 1, shadow: 0, purified: 0 },
  current: { candy: 0, xlCandy: 0, megaEnergy: 0, level: 1, megaLevel: 0 },
  target: { level: 1, megaLevel: 4, ...target },
});

describe("calibration overrides reward ranges", () => {
  it("a higher observed Super Mega energy lowers the Mewtwo Mega-Energy raids", () => {
    const boss = getBoss("mega-mewtwo-x")!;
    const base = computeBossResult(boss, input("mega-mewtwo-x"));
    const calibrated = computeBossResult(boss, input("mega-mewtwo-x"), { superMegaEnergy: 1000 });
    // 1000 energy/raid >> the assumed 400–450, so far fewer raids are required.
    expect(calibrated.needs.megaEnergy!.raidsRange.max).toBeLessThan(base.needs.megaEnergy!.raidsRange.max);
  });

  it("collapses the Mega-Energy raids to a point estimate when calibrated", () => {
    const boss = getBoss("mega-mewtwo-x")!;
    const r = computeBossResult(boss, input("mega-mewtwo-x"), { superMegaEnergy: 1000 }).needs.megaEnergy!.raidsRange;
    expect(r.min).toBe(r.max); // a single observed value removes the candy-luck spread
  });

  it("a calibration of 0 falls back to the assumed range", () => {
    const boss = getBoss("mega-mewtwo-x")!;
    const base = computeBossResult(boss, input("mega-mewtwo-x")).needs.megaEnergy!.raidsRange;
    const zero = computeBossResult(boss, input("mega-mewtwo-x"), { superMegaEnergy: 0 }).needs.megaEnergy!.raidsRange;
    expect(zero).toEqual(base);
  });

  it("calibrates legendary Candy XL for a 5★ leveling goal", () => {
    const boss = getBoss("zekrom")!; // five-star → legendaryXl metric
    // current L1 → target L50 needs the full 40→50 XL band (296 XL).
    const r = computeBossResult(boss, input("zekrom", { level: 50 }), { legendaryXl: 296 }).needs.xlCandy!.raidsRange;
    expect(r).toEqual({ min: 1, max: 1 }); // 296 needed at 296/catch = exactly one raid
  });
});

describe("same-type Mega buddy XL boost", () => {
  const articuno = getBoss("articuno")!; // Ice/Flying → Flying is a Level-4 type
  const raikou = getBoss("raikou")!; // Electric → not a Level-4 type

  it("flags Level-4 eligibility from typing", () => {
    expect(isL4Eligible(articuno)).toBe(true);
    expect(isL4Eligible(raikou)).toBe(false);
  });

  it("maps mega level to the boost factor", () => {
    expect(xlBoostFactor(articuno, input("articuno"), 1)).toBeCloseTo(1.0); // base
    expect(xlBoostFactor(articuno, input("articuno"), 2)).toBeCloseTo(1.1); // high
    expect(xlBoostFactor(articuno, input("articuno"), 3)).toBeCloseTo(1.25); // max ("standard")
  });

  it("l4Buddy promotes an eligible boss to +30%, but is ignored when ineligible", () => {
    expect(xlBoostFactor(articuno, { ...input("articuno"), l4Buddy: true }, 1)).toBeCloseTo(1.3);
    expect(xlBoostFactor(raikou, { ...input("raikou"), l4Buddy: true }, 1)).toBeCloseTo(1.0);
  });

  it("requires an active matching buddy (no boost when skipping or buddy off)", () => {
    expect(xlBoostFactor(articuno, { ...input("articuno"), skipCatch: true }, 3)).toBe(1);
    expect(xlBoostFactor(articuno, { ...input("articuno"), megaBuddy: false }, 3)).toBe(1);
  });

  it("a leveled buddy lowers the XL raids needed, L4 most of all", () => {
    const goal = (over: Partial<BossInput>, level: number) =>
      computeBossResult(articuno, { ...input("articuno", { level: 50 }), ...over }, {}, level).needs.xlCandy!.raidsRange.max;
    const base = goal({}, 1); // no boost
    const standard = goal({}, 3); // +25%
    const superMax = goal({ l4Buddy: true }, 3); // +30%
    expect(standard).toBeLessThan(base);
    expect(superMax).toBeLessThan(standard);
  });

  it("does not boost a calibrated (observed) XL value", () => {
    const boostedAtL3 = computeBossResult(articuno, input("articuno", { level: 50 }), { legendaryXl: 6 }, 3)
      .needs.xlCandy!.raidsRange.max;
    const boostedAtL1 = computeBossResult(articuno, input("articuno", { level: 50 }), { legendaryXl: 6 }, 1)
      .needs.xlCandy!.raidsRange.max;
    expect(boostedAtL3).toBe(boostedAtL1); // calibration wins; boost not re-applied
  });
});
