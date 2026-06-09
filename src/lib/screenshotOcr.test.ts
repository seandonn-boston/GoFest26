import { describe, expect, it } from "vitest";
import { aggregateEntries, fuzzyMatchSpecies, parseByGrid, parseByTextOrder, parseEntriesFromText } from "./screenshotOcr";
import { buildSearchString, pokemonSearchName, speciesKey } from "./pokemonSearch";
import { RAID_BOSSES } from "@/data";

function scan(text: string, capturedAt = 0) {
  return aggregateEntries(parseEntriesFromText(text), capturedAt);
}

describe("screenshot parse + identify", () => {
  it("reads a Mewtwo page and identifies it by the energy label", () => {
    const r = scan(["26", "MEWTWO CANDY", "27", "MEWTWO CANDY XL", "0", "MEWTWO MEGA ENERGY", "X", "0", "MEWTWO MEGA ENERGY", "Y"].join("\n"));
    expect(r.species).toBe("mewtwo");
    expect(r.candy).toBe(26);
    expect(r.xlCandy).toBe(27);
    expect(r.megaEnergies).toEqual([0, 0]);
  });

  it("identifies by the energy label, not the (base-form) candy label", () => {
    // Dragonite screenshot: DRATINI candy but DRAGONITE mega energy.
    const r = scan(["1,427", "DRATINI CANDY", "25", "DRATINI CANDY XL", "3,985", "DRAGONITE MEGA ENERGY"].join("\n"));
    expect(r.species).toBe("dragonite");
    expect(r.candy).toBe(1427);
    expect(r.xlCandy).toBe(25);
    expect(r.megaEnergies).toEqual([3985]);
  });

  it("reads a legendary with primal energy", () => {
    const r = scan(["181", "GROUDON CANDY", "82", "GROUDON CANDY XL", "485", "GROUDON PRIMAL ENERGY"].join("\n"));
    expect(r.species).toBe("groudon");
    expect(r.megaEnergies).toEqual([485]);
  });
});

describe("parseByGrid (layout-aware number grid)", () => {
  // A number word box at (x,y); CP at top should be ignored, Stardust anchors.
  const n = (text: string, x: number, y: number) => ({ text, x0: x, y0: y, x1: x + 60, y1: y + 24 });

  it("non-mega: Stardust | Candy | XL in one row", () => {
    const words = [
      n("4724", 200, 60), // CP at top — must be ignored
      n("1,001,623", 100, 1000),
      n("170", 400, 1000),
      n("205", 700, 1000),
    ];
    expect(parseByGrid(words)).toEqual({ candy: 170, xlCandy: 205, megaEnergies: [] });
  });

  it("mega: Stardust|Candy on top, XL|Energy below", () => {
    const words = [
      n("1,001,623", 100, 1000),
      n("67", 400, 1000),
      n("12", 100, 1150),
      n("9,475", 400, 1150),
    ];
    expect(parseByGrid(words)).toEqual({ candy: 67, xlCandy: 12, megaEnergies: [9475] });
  });

  it("mega X/Y: a third (close) row for the second energy", () => {
    const words = [
      n("11,001,623", 100, 1000), // OCR-mangled Stardust (>10M) still anchors
      n("26", 400, 1000),
      n("27", 100, 1150),
      n("0", 400, 1150),
      n("0", 250, 1300),
    ];
    expect(parseByGrid(words)).toEqual({ candy: 26, xlCandy: 27, megaEnergies: [0, 0] });
  });

  it("single mega: ignores the far-below Mega-Evolve cost row", () => {
    const words = [
      n("1,001,623", 100, 1000),
      n("67", 400, 1000),
      n("12", 100, 1150),
      n("9,475", 400, 1150),
      n("7,500", 250, 1500), // big gap below -> the Mega Evolve cost, not energy
    ];
    expect(parseByGrid(words)).toEqual({ candy: 67, xlCandy: 12, megaEnergies: [9475] });
  });
});

describe("parseByTextOrder (no word boxes)", () => {
  it("anchors on the largest number (Stardust) and reads forward", () => {
    expect(parseByTextOrder("4724 192 192 1,001,623 23 47 GYMS")).toEqual({ candy: 23, xlCandy: 47, megaEnergies: [] });
    expect(parseByTextOrder("cp 1,001,623 67 12 9,475 7,500 evolve")).toEqual({ candy: 67, xlCandy: 12, megaEnergies: [9475] });
  });
});

describe("fuzzyMatchSpecies (vocabulary-validated)", () => {
  const vocab = [
    { key: "mewtwo", name: "MEWTWO" },
    { key: "zacian", name: "ZACIAN" },
    { key: "reshiram", name: "RESHIRAM" },
    { key: "tyranitar", name: "TYRANITAR" },
  ];

  it("snaps a near-miss to the right species", () => {
    expect(fuzzyMatchSpecies("blah MEWTW0 CANDY 26", vocab)).toBe("mewtwo"); // 0 -> O
    expect(fuzzyMatchSpecies("ZAClAN CANDY 23", vocab)).toBe("zacian"); // l -> I
    expect(fuzzyMatchSpecies("TYRANITAR MEGA ENERGY 209", vocab)).toBe("tyranitar"); // from energy label
  });

  it("returns null for garbage that isn't close to any species", () => {
    expect(fuzzyMatchSpecies("cr4d 724 OF Ares HP kg", vocab)).toBeNull();
  });
});

describe("species matching against the roster", () => {
  const keys = new Set(RAID_BOSSES.map((b) => speciesKey(b.name)));

  it("matches raid targets and flags non-targets", () => {
    expect(keys.has("groudon")).toBe(true);
    expect(keys.has("mewtwo")).toBe(true);
    expect(keys.has("tyranitar")).toBe(true);
    expect(keys.has("dragonite")).toBe(false); // not a GO Fest raid target -> flagged
  });

  it("collapses Mewtwo X/Y to one species key (shared pool)", () => {
    const mewtwo = RAID_BOSSES.filter((b) => speciesKey(b.name) === "mewtwo");
    expect(mewtwo.map((b) => b.id).sort()).toEqual(["mega-mewtwo-x", "mega-mewtwo-y"]);
  });
});

describe("pokemon search string", () => {
  it("reduces names to species terms and dedupes", () => {
    expect(pokemonSearchName("Mega Mewtwo X")).toBe("Mewtwo");
    expect(speciesKey("Ho-Oh")).toBe("hooh");
    expect(buildSearchString(["Mega Mewtwo X", "Mega Mewtwo Y", "Reshiram"])).toBe("Mewtwo, Reshiram");
  });
});
