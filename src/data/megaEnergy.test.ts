import { describe, expect, it } from "vitest";
import { getBoss, GAME_CONFIG } from "@/data";

/** First-evolution Mega Energy = megaLevelEnergyTotals[1]. */
const first = (id: string) => getBoss(id)?.megaLevelEnergyTotals?.[1];

describe("mega energy first-evolution costs", () => {
  it("pseudo-legendaries cost 300 to first-evolve (not 200)", () => {
    for (const id of ["mega-tyranitar", "mega-salamence", "mega-metagross", "mega-garchomp"]) {
      expect(first(id)).toBe(300);
    }
  });

  it("Pidgeot and Beedrill cost 100", () => {
    expect(first("mega-pidgeot")).toBe(100);
    expect(first("mega-beedrill")).toBe(100);
  });

  it("typical megas stay at the generic 200 first-evolve", () => {
    for (const id of ["mega-gengar", "mega-blaziken", "mega-gardevoir", "mega-lucario"]) {
      expect(first(id)).toBe(200);
    }
  });

  it("the level curve scales from the first-evolve cost ([0, F, 1.8F, 2.8F])", () => {
    // F=200 reproduces the generic curve exactly.
    expect(getBoss("mega-gengar")?.megaLevelEnergyTotals).toEqual(GAME_CONFIG.genericMegaLevelTotals);
    // F=300 → [0, 300, 540, 840].
    expect(getBoss("mega-tyranitar")?.megaLevelEnergyTotals).toEqual([0, 300, 540, 840]);
  });
});
