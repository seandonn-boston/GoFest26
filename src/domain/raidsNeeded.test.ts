import { describe, expect, it } from "vitest";
import { computeBossResult } from "./raidsNeeded";
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
