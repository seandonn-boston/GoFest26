import { describe, expect, it } from "vitest";
import { parseFromText } from "./screenshotOcr";
import { buildSearchString, pokemonSearchName } from "./pokemonSearch";

describe("parseFromText (screenshot OCR fallback)", () => {
  it("reads a Mewtwo page with X and Y energy", () => {
    const text = [
      "999,113", "STARDUST",
      "26", "MEWTWO CANDY",
      "27", "MEWTWO CANDY XL",
      "0", "MEWTWO MEGA ENERGY", "X",
      "0", "MEWTWO MEGA ENERGY", "Y",
    ].join("\n");
    const p = parseFromText(text);
    expect(p.candy).toBe(26);
    expect(p.xlCandy).toBe(27);
    expect(p.megaEnergies).toEqual([0, 0]);
  });

  it("reads a non-mega page with primal energy", () => {
    const text = ["181", "GROUDON CANDY", "82", "GROUDON CANDY XL", "485", "GROUDON PRIMAL ENERGY"].join("\n");
    const p = parseFromText(text);
    expect(p.candy).toBe(181);
    expect(p.xlCandy).toBe(82);
    expect(p.megaEnergies).toEqual([485]);
  });

  it("handles number and label on the same line", () => {
    const p = parseFromText("67 RAYQUAZA CANDY\n12 RAYQUAZA CANDY XL\n9,475 RAYQUAZA MEGA ENERGY");
    expect(p.candy).toBe(67);
    expect(p.xlCandy).toBe(12);
    expect(p.megaEnergies).toEqual([9475]);
  });
});

describe("pokemon search string", () => {
  it("reduces names to species search terms", () => {
    expect(pokemonSearchName("Mega Mewtwo X")).toBe("Mewtwo");
    expect(pokemonSearchName("Origin Forme Dialga")).toBe("Dialga");
    expect(pokemonSearchName("Giratina (Origin)")).toBe("Giratina");
    expect(pokemonSearchName("Tornadus (Incarnate & Therian)")).toBe("Tornadus");
    expect(pokemonSearchName("Zacian (Hero of Many Battles)")).toBe("Zacian");
    expect(pokemonSearchName("Tapu Koko")).toBe("Tapu Koko");
  });

  it("dedupes and comma-joins (commas = OR in PoGo search)", () => {
    const s = buildSearchString(["Mega Mewtwo X", "Mega Mewtwo Y", "Reshiram", "Origin Forme Dialga", "Dialga"]);
    expect(s).toBe("Mewtwo, Reshiram, Dialga");
  });
});
