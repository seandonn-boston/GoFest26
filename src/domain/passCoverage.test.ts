import { describe, expect, it } from "vitest";
import { computePassCoverage, type SpeciesPassNeed } from "./passCoverage";

const need = (bossId: string, min: number, max: number): SpeciesPassNeed => ({
  bossId,
  bossName: bossId,
  raids: { min, max },
});

describe("computePassCoverage", () => {
  it("allocates owned passes to the highest priorities first", () => {
    const ordered = [need("a", 8, 10), need("b", 4, 6), need("c", 2, 3)];
    const cov = computePassCoverage(ordered, 12);
    // 12 owned: a takes its worst-case 10, b takes the remaining 2, c gets none.
    expect(cov.perSpecies[0].covered).toBe(10);
    expect(cov.perSpecies[1].covered).toBe(2);
    expect(cov.perSpecies[2].covered).toBe(0);
    // b still needs to buy up to 4 (6 − 2); c needs its whole range.
    expect(cov.perSpecies[1].toBuy).toEqual({ min: 2, max: 4 });
    expect(cov.perSpecies[2].toBuy).toEqual({ min: 2, max: 3 });
  });

  it("sums totals and the buy gap across all targets", () => {
    const ordered = [need("a", 8, 10), need("b", 4, 6)];
    const cov = computePassCoverage(ordered, 5);
    expect(cov.needed).toEqual({ min: 12, max: 16 });
    expect(cov.covered).toEqual({ min: 5, max: 5 });
    expect(cov.toBuy).toEqual({ min: 7, max: 11 });
    expect(cov.surplus).toBe(0);
  });

  it("reports surplus when owned passes exceed the worst case", () => {
    const cov = computePassCoverage([need("a", 2, 3)], 10);
    expect(cov.toBuy).toEqual({ min: 0, max: 0 });
    expect(cov.surplus).toBe(7);
    expect(cov.perSpecies[0].toBuy).toEqual({ min: 0, max: 0 });
  });

  it("handles zero owned passes (buy everything)", () => {
    const cov = computePassCoverage([need("a", 2, 3)], 0);
    expect(cov.covered).toEqual({ min: 0, max: 0 });
    expect(cov.toBuy).toEqual({ min: 2, max: 3 });
  });
});
