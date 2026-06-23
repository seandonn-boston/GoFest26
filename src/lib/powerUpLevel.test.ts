import { describe, it, expect } from "vitest";
import { POWER_UP_COSTS } from "@/data/powerUpCosts";
import { inferLevelFromPowerUpCost } from "@/lib/powerUpLevel";

const row = (variant: string, level: number) =>
  POWER_UP_COSTS.find((r) => r.variant === variant && r.level === level);

describe("power-up cost table matches the published GO Hub values", () => {
  it("standard sub-40 dust + candy spot-checks", () => {
    expect(row("standard", 1)).toMatchObject({ stardust: 200, candy: 1 });
    expect(row("standard", 10.5)).toMatchObject({ stardust: 1000, candy: 1 });
    expect(row("standard", 11)).toMatchObject({ stardust: 1300, candy: 2 });
    expect(row("standard", 30.5)).toMatchObject({ stardust: 5000, candy: 4 });
    expect(row("standard", 31)).toMatchObject({ stardust: 6000, candy: 6 });
    expect(row("standard", 39.5)).toMatchObject({ stardust: 10000, candy: 15 });
  });

  it("lucky halves stardust, keeps candy", () => {
    expect(row("lucky", 1)).toMatchObject({ stardust: 100, candy: 1 });
    expect(row("lucky", 39.5)).toMatchObject({ stardust: 5000, candy: 15 });
  });

  it("shadow (from L8) is +20% dust with its own candy curve", () => {
    expect(row("shadow", 8)).toMatchObject({ stardust: 960, candy: 2 });
    expect(row("shadow", 39.5)).toMatchObject({ stardust: 12000, candy: 18 });
    expect(row("shadow", 7)).toBeUndefined();
  });

  it("purified (from L25) is -10% dust with its own candy curve", () => {
    expect(row("purified", 25)).toMatchObject({ stardust: 3600, candy: 3 });
    expect(row("purified", 39.5)).toMatchObject({ stardust: 9000, candy: 14 });
    expect(row("purified", 24.5)).toBeUndefined();
  });

  it("standard XL band L41→50.5", () => {
    expect(row("standard", 41)).toMatchObject({ stardust: 10000, xl: 10 });
    expect(row("standard", 43)).toMatchObject({ stardust: 11000, xl: 12 });
    expect(row("standard", 50)).toMatchObject({ stardust: 15000, xl: 20 });
    expect(row("standard", 50.5)).toMatchObject({ stardust: 15000, xl: 20 });
  });
});

describe("inferLevelFromPowerUpCost", () => {
  it("XL + stardust pins a single integer level (41/41.5 ambiguity only)", () => {
    const r = inferLevelFromPowerUpCost({ stardust: 10000, xl: 10 });
    expect(r).toMatchObject({ level: 41, min: 41, max: 41.5, confident: true });
  });

  it("XL alone is ambiguous across the dust step (10 XL = L41 or L42)", () => {
    const r = inferLevelFromPowerUpCost({ xl: 10 });
    expect(r.min).toBe(41);
    expect(r.max).toBe(42.5);
    expect(r.confident).toBe(false);
  });

  it("distinguishes 49 from 50 by stardust at equal XL", () => {
    expect(inferLevelFromPowerUpCost({ stardust: 14000, xl: 20 }).level).toBe(49);
    expect(inferLevelFromPowerUpCost({ stardust: 15000, xl: 20 }).level).toBe(50);
  });

  it("sub-40 candy + stardust gives a 4-half-level band", () => {
    const r = inferLevelFromPowerUpCost({ stardust: 200, candy: 1 });
    expect(r).toMatchObject({ min: 1, max: 2.5, confident: false });
  });

  it("uses the variant's table for sub-40 inference", () => {
    // 960 dust / 2 candy is a Shadow-only row (L8); standard never costs that.
    expect(inferLevelFromPowerUpCost({ stardust: 960, candy: 2, variant: "shadow" }).level).toBe(8);
    expect(inferLevelFromPowerUpCost({ stardust: 960, candy: 2, variant: "standard" }).level).toBeNull();
  });

  it("returns null when nothing matches or nothing is readable", () => {
    expect(inferLevelFromPowerUpCost({ stardust: 12345, xl: 99 }).level).toBeNull();
    expect(inferLevelFromPowerUpCost({}).level).toBeNull();
  });
});
