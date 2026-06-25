import { describe, expect, it } from "vitest";
import { computeGrossRequirement, computeNetNeed, copiesOf, perCopyNeeds } from "./requirements";
import { getBoss } from "@/data";
import type { BossInput, PokemonCopy } from "./types";

const base = (over: Partial<BossInput> = {}): BossInput => ({
  bossId: "zekrom",
  selected: true,
  counts: { standard: 1, shadow: 0, purified: 0 },
  current: { candy: 0, xlCandy: 0, megaEnergy: 0, level: 40, megaLevel: 0 },
  target: { level: 50, megaLevel: 0 },
  ...over,
});

const zekrom = getBoss("zekrom")!;

describe("variant-aware XL requirement", () => {
  it("regular 296 / shadow 360 / purified 272 for a full 40→50 climb", () => {
    expect(computeGrossRequirement(zekrom, base()).xlCandy).toBe(296); // backward-compatible default
    expect(computeGrossRequirement(zekrom, base({ variant: "shadow" })).xlCandy).toBe(360);
    expect(computeGrossRequirement(zekrom, base({ variant: "purified" })).xlCandy).toBe(272);
  });
});

describe("Dynamax Max Move costs", () => {
  const atLevel50 = (over: Partial<PokemonCopy> = {}): PokemonCopy => ({
    id: "x", variant: "standard", current: { level: 50, megaLevel: 0 }, target: { level: 50, megaLevel: 0 }, ...over,
  });

  it("adds 400 Candy + 120 XL when maxMoves is on (all three moves)", () => {
    // Level 50→50 so there's no leveling cost — the toggle is the whole bill.
    const g = computeGrossRequirement(zekrom, base({ copies: [atLevel50({ maxMoves: true })] }));
    expect(g.candy).toBe(400);
    expect(g.xlCandy).toBe(120);
  });

  it("adds nothing when maxMoves is off or unset", () => {
    const g = computeGrossRequirement(zekrom, base({ copies: [atLevel50()] }));
    expect(g.candy ?? 0).toBe(0);
    expect(g.xlCandy ?? 0).toBe(0);
  });

  it("stacks on top of the leveling requirement", () => {
    const climb = atLevel50({ current: { level: 40, megaLevel: 0 }, maxMoves: true });
    const g = computeGrossRequirement(zekrom, base({ copies: [climb] }));
    expect(g.xlCandy).toBe(296 + 120); // 40→50 climb + the three maxed moves
  });
});

describe("copiesOf", () => {
  it("falls back to a single copy ×quantity when no explicit copies", () => {
    expect(copiesOf(base())).toHaveLength(1);
    expect(copiesOf(base({ quantity: 3 }))).toHaveLength(3);
  });
  it("uses the explicit copies in priority order", () => {
    const copies: PokemonCopy[] = [
      { id: "a", variant: "standard", current: { level: 40, megaLevel: 0 }, target: { level: 50, megaLevel: 0 } },
      { id: "b", variant: "shadow", current: { level: 45, megaLevel: 0 }, target: { level: 50, megaLevel: 0 } },
    ];
    expect(copiesOf(base({ copies })).map((c) => c.id)).toEqual(["a", "b"]);
  });
});

describe("multi-copy gross + cascading on-hand pool", () => {
  const copies: PokemonCopy[] = [
    { id: "a", variant: "standard", current: { level: 40, megaLevel: 0 }, target: { level: 50, megaLevel: 0 } }, // 296
    { id: "b", variant: "standard", current: { level: 45, megaLevel: 0 }, target: { level: 50, megaLevel: 0 } }, // 148
  ];

  it("sums each copy's gross XL", () => {
    expect(computeGrossRequirement(zekrom, base({ copies })).xlCandy).toBe(296 + 148);
  });

  it("cascades on-hand XL to the highest-priority copy first", () => {
    // 200 XL on hand → all to copy a (296 → 96 left); copy b keeps its full 148.
    const input = base({ copies, current: { candy: 0, xlCandy: 200, megaEnergy: 0, level: 40, megaLevel: 0 } });
    const per = perCopyNeeds(zekrom, input);
    expect(per[0].net.xlCandy).toBe(96);
    expect(per[1].net.xlCandy).toBe(148);
    expect(computeNetNeed(zekrom, input).xlCandy).toBe(96 + 148); // total matches the engine
  });
});

describe("per-copy mega energy", () => {
  it("sums energy across copies, each with its own start/target mega level", () => {
    const x = getBoss("mega-mewtwo-x")!;
    const totals = x.megaLevelEnergyTotals!;
    const copies: PokemonCopy[] = [
      { id: "a", variant: "standard", current: { level: 50, megaLevel: 0 }, target: { level: 50, megaLevel: 4 } },
      { id: "b", variant: "standard", current: { level: 50, megaLevel: 3 }, target: { level: 50, megaLevel: 4 } },
    ];
    const g = computeGrossRequirement(x, base({ bossId: "mega-mewtwo-x", copies }));
    expect(g.megaEnergy).toBe(totals[4] - totals[0] + (totals[4] - totals[3]));
  });
});
