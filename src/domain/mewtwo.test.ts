import { describe, expect, it } from "vitest";
import { computeMewtwoResults } from "./mewtwo";
import type { BossInput, PokemonCopy } from "./types";

// X/Y totals are [0,7500,10080,13580,18580]: 0→4 = 18,580, 3→4 = 5,000.
const mk = (bossId: string, over: Partial<BossInput> = {}): BossInput => ({
  bossId,
  selected: true,
  counts: { standard: 1, shadow: 0, purified: 0 },
  current: { candy: 0, xlCandy: 0, megaEnergy: 0, level: 50, megaLevel: 0 },
  target: { level: 50, megaLevel: 4 },
  ...over,
});

describe("computeMewtwoResults", () => {
  it("single Mewtwo, both forms: each branch needs its own 0→4 energy", () => {
    const [rx, ry] = computeMewtwoResults([mk("mega-mewtwo-x"), mk("mega-mewtwo-y")]);
    expect(rx.needs.megaEnergy!.needed).toBe(18580);
    expect(ry.needs.megaEnergy!.needed).toBe(18580);
  });

  it("independent X & Y mega levels per individual (X0/Y3)", () => {
    const copies: PokemonCopy[] = [
      {
        id: "a",
        variant: "standard",
        current: { level: 50, megaLevel: 0, megaLevelY: 3 },
        target: { level: 50, megaLevel: 4, megaLevelY: 4 },
      },
    ];
    const [rx, ry] = computeMewtwoResults([mk("mega-mewtwo-x", { copies }), mk("mega-mewtwo-y")]);
    expect(rx.needs.megaEnergy!.needed).toBe(18580); // X 0→4
    expect(ry.needs.megaEnergy!.needed).toBe(5000); // Y 3→4 (independent)
  });

  it("the worked two-Mewtwo example: summed energy + shared XL counted once", () => {
    // #1 lvl40 X0/Y0 (296 XL, 18580+18580 energy); #2 lvl25 X3/Y3 (296 XL, 5000+5000).
    const copies: PokemonCopy[] = [
      {
        id: "1",
        variant: "standard",
        current: { level: 40, megaLevel: 0, megaLevelY: 0 },
        target: { level: 50, megaLevel: 4, megaLevelY: 4 },
      },
      {
        id: "2",
        variant: "standard",
        current: { level: 25, megaLevel: 3, megaLevelY: 3 },
        target: { level: 50, megaLevel: 4, megaLevelY: 4 },
      },
    ];
    const x = mk("mega-mewtwo-x", { copies, current: { candy: 0, xlCandy: 200, megaEnergy: 0, level: 40, megaLevel: 0 } });
    const [rx, ry] = computeMewtwoResults([x, mk("mega-mewtwo-y")]);

    expect(rx.needs.megaEnergy!.needed).toBe(18580 + 5000); // X energy summed
    expect(ry.needs.megaEnergy!.needed).toBe(18580 + 5000); // Y energy summed
    // XL counted ONCE per individual: 296 + 296 = 592, minus 200 on hand = 392,
    // split across the two forms (not doubled).
    const xl = (rx.needs.xlCandy?.needed ?? 0) + (ry.needs.xlCandy?.needed ?? 0);
    expect(xl).toBe(592 - 200);
  });

  it("a single form keeps the whole leveling", () => {
    const x = mk("mega-mewtwo-x", {
      current: { candy: 0, xlCandy: 0, megaEnergy: 0, level: 40, megaLevel: 0 },
      target: { level: 50, megaLevel: 4 },
    });
    const results = computeMewtwoResults([x]); // X only
    expect(results).toHaveLength(1);
    expect(results[0].needs.xlCandy!.needed).toBe(296);
    expect(results[0].needs.megaEnergy!.needed).toBe(18580);
  });

  it("variant raises the shared leveling (shadow 360)", () => {
    const copies: PokemonCopy[] = [
      {
        id: "a",
        variant: "shadow",
        current: { level: 40, megaLevel: 4, megaLevelY: 4 },
        target: { level: 50, megaLevel: 4, megaLevelY: 4 },
      },
    ];
    const results = computeMewtwoResults([mk("mega-mewtwo-x", { copies })]); // X only, energy maxed
    expect(results[0].needs.xlCandy!.needed).toBe(360);
  });
});
