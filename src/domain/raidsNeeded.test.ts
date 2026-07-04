import { describe, expect, it } from "vitest";
import { computeBossResult, isL4Eligible, xlBuddyBonus, rewardBreakdown } from "./raidsNeeded";
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

  it("maps mega level to the guaranteed XL bonus (whole candy, not a multiplier)", () => {
    expect(xlBuddyBonus(articuno, input("articuno"), 1)).toBe(0); // base — no boost
    expect(xlBuddyBonus(articuno, input("articuno"), 2)).toBe(1); // high — guaranteed +1
    expect(xlBuddyBonus(articuno, input("articuno"), 3)).toBe(1); // max ("standard") — guaranteed +1
  });

  it("l4Buddy promotes an eligible boss to a boost, but is ignored when ineligible", () => {
    expect(xlBuddyBonus(articuno, { ...input("articuno"), l4Buddy: true }, 1)).toBe(1); // L4 → +1
    expect(xlBuddyBonus(raikou, { ...input("raikou"), l4Buddy: true }, 1)).toBe(0); // ineligible → stays L1 → 0
  });

  it("requires an active matching buddy (no boost when buddy off)", () => {
    expect(xlBuddyBonus(articuno, { ...input("articuno"), megaBuddy: false }, 3)).toBe(0);
  });

  it("floors the per-raid XL range up by the guaranteed +1 (1–3 → 2–4)", () => {
    // A Mega boss (megaXl base 1–3). With a boosting buddy the reward floors to 2–4.
    const gengar = getBoss("mega-gengar")!;
    const bd = rewardBreakdown(gengar, "xlCandy", { ...input("mega-gengar"), megaBuddy: true }, {}, 3);
    expect(bd.base).toEqual({ min: 1, max: 3 });
    expect(bd.xlBonus).toBe(1);
    expect(bd.range).toEqual({ min: 2, max: 4 });
  });

  it("a boosting buddy lowers the XL raids needed; the guaranteed floor is level-flat", () => {
    const goal = (over: Partial<BossInput>, level: number) =>
      computeBossResult(articuno, { ...input("articuno", { level: 50 }), ...over }, {}, level).needs.xlCandy!.raidsRange.max;
    const base = goal({}, 1); // no boost
    const standard = goal({}, 3); // guaranteed +1
    const superMax = goal({ l4Buddy: true }, 3); // L4 — same guaranteed +1
    expect(standard).toBeLessThan(base);
    expect(superMax).toBe(standard); // the bonus is a banked +1 at any boosting level
  });

  it("does not boost a calibrated (observed) XL value", () => {
    const boostedAtL3 = computeBossResult(articuno, input("articuno", { level: 50 }), { legendaryXl: 6 }, 3).needs.xlCandy!
      .raidsRange.max;
    const boostedAtL1 = computeBossResult(articuno, input("articuno", { level: 50 }), { legendaryXl: 6 }, 1).needs.xlCandy!
      .raidsRange.max;
    expect(boostedAtL3).toBe(boostedAtL1); // calibration wins; boost not re-applied
  });
});
