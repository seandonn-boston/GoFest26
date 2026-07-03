import { describe, expect, it } from "vitest";
import { computeAllocation, hasPins } from "./allocate";
import type { BlockAllocation } from "./types";

const P: BlockAllocation = { mode: "priority" };
const share = (weight: number): BlockAllocation => ({ mode: "share", weight });
const fixed = (count: number): BlockAllocation => ({ mode: "fixed", count });
const goal = (percent: number): BlockAllocation => ({ mode: "goal", percent });
const floor = (count: number): BlockAllocation => ({ mode: "floor", count });
const ceiling = (count: number): BlockAllocation => ({ mode: "ceiling", count });
const ones = (n: number) => new Array(n).fill(1);

describe("computeAllocation", () => {
  it("all-priority reduces to greedy fill (fills in order, tail cut)", () => {
    // needs 10/10/10, capacity 15 → first two fill, third gets the crumb.
    expect(computeAllocation([10, 10, 10], ones(3), [P, P, P], 15)).toEqual([10, 5, 0]);
  });

  it("equal-weight shares split the window evenly (the 'even' button)", () => {
    // 30 slots, 3 even shares, big needs → 10/10/10.
    expect(computeAllocation([30, 30, 30], ones(3), [share(1), share(1), share(1)], 30)).toEqual([10, 10, 10]);
  });

  it("weighted shares split time in proportion (50 / 40 / 10)", () => {
    expect(computeAllocation([100, 100, 100], ones(3), [share(50), share(40), share(10)], 100)).toEqual([50, 40, 10]);
  });

  it("a share capped at its need reflows the slack to the others", () => {
    // Ray wants only 5 though its weight is 50; the freed time goes to Kyo/Gro.
    const out = computeAllocation([5, 100, 100], ones(3), [share(50), share(40), share(10)], 100);
    expect(out[0]).toBe(5);
    expect(out[0] + out[1] + out[2]).toBe(100); // whole window used
    expect(out[1]).toBeGreaterThan(out[2]); // Kyo (40) still outweighs Gro (10)
  });

  it("a fixed count is reserved off the top, priority fills the rest", () => {
    // 10 Mewtwo fixed, then Ray (priority) takes the remaining 10 of a 20 window.
    expect(computeAllocation([50, 50], ones(2), [fixed(10), P], 20)).toEqual([10, 10]);
  });

  it("mixes fixed + share + priority (10 Mewtwo, then 50% split, then leftover)", () => {
    // Window 30. Mewtwo fixed 10. Two shares (weight 1 each) split the remaining
    // 20 → 10/10. A 4th priority target gets nothing (window full).
    const out = computeAllocation([40, 40, 40, 40], ones(4), [fixed(10), share(1), share(1), P], 30);
    expect(out).toEqual([10, 10, 10, 0]);
  });

  it("a fixed count is capped by need and by remaining capacity", () => {
    // Wants 10 fixed but only 3 needed, and only 3 of a tiny window anyway.
    expect(computeAllocation([3, 100], ones(2), [fixed(10), P], 3)).toEqual([3, 0]);
  });

  it("weights time, not raw raids, when quick-catch makes a target cheaper", () => {
    // Two even shares; target B is quick-catch (cost 0.5), so equal TIME buys it
    // twice the raids. Window = 12 slots → 6 slots each: A 6 (×1), B 12 (×0.5).
    const out = computeAllocation([100, 100], [1, 0.5], [share(1), share(1)], 12);
    expect(out[0] * 1).toBeCloseTo(out[1] * 0.5, 5); // equal TIME on each
    expect(out[0]).toBe(6);
    expect(out[1]).toBe(12);
  });

  it("goal mode reserves a percentage of the target's OWN need off the top", () => {
    // 80% of a 50-raid goal = 40 raids reserved here; the rest is left for elsewhere.
    expect(computeAllocation([50, 100], ones(2), [goal(80), P], 100)).toEqual([40, 60]);
  });

  it("the full mixed scenario: fixed 10 → goal 80% → even split → one gets nothing", () => {
    // Window 70. Mewtwo fixed 10, target B 80% of its 50-goal = 40 (50 used, 20 left),
    // C & D split the remaining 20 evenly (10/10), E is priority and gets 0.
    const out = computeAllocation([50, 50, 50, 50, 50], ones(5), [fixed(10), goal(80), share(1), share(1), P], 70);
    expect(out).toEqual([10, 40, 10, 10, 0]);
  });

  it("floor guarantees a minimum, then the target competes for more", () => {
    // B is low-priority (drag order A, B) but has a floor of 5 → it gets ≥5 even
    // though A would otherwise eat the whole 20-slot window; A takes the other 15.
    const out = computeAllocation([100, 100], ones(2), [P, floor(5)], 20);
    expect(out[1]).toBeGreaterThanOrEqual(5);
    expect(out).toEqual([15, 5]);
  });

  it("floor still competes for time beyond its minimum when it ranks first", () => {
    // A floored at 3 but ranked first → takes its whole need; B gets the rest.
    expect(computeAllocation([100, 100], ones(2), [floor(3), P], 20)).toEqual([20, 0]);
  });

  it("ceiling caps a target and spills the rest of its need elsewhere", () => {
    // A is first but capped at 4; the remaining 16 of the window flow to B.
    expect(computeAllocation([100, 100], ones(2), [ceiling(4), P], 20)).toEqual([4, 16]);
  });

  it("hasPins is false for an all-default window, true once anything is pinned", () => {
    expect(hasPins([undefined, P, undefined])).toBe(false);
    expect(hasPins([P, share(1)])).toBe(true);
    expect(hasPins([fixed(5)])).toBe(true);
  });
});
