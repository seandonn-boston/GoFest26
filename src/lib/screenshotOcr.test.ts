import { describe, expect, it } from "vitest";
import { aggregateEntries, chooseSpecies, energyForBosses, fuzzyMatchSpecies, parseByGrid, parseByTextOrder, parseEntriesFromText } from "./screenshotOcr";
import { buildSearchString, pokemonSearchName, speciesKey } from "./pokemonSearch";
import { RAID_BOSSES } from "@/data";

function scan(text: string, capturedAt = 0) {
  return aggregateEntries(parseEntriesFromText(text), capturedAt);
}

describe("screenshot parse + identify", () => {
  it("reads a Mewtwo page and tags each energy with its species", () => {
    const r = scan(["26", "MEWTWO CANDY", "27", "MEWTWO CANDY XL", "0", "MEWTWO MEGA ENERGY", "X", "0", "MEWTWO MEGA ENERGY", "Y"].join("\n"));
    expect(r.species).toBe("mewtwo");
    expect(r.candy).toBe(26);
    expect(r.xlCandy).toBe(27);
    expect(r.megaEnergies).toEqual([
      { value: 0, species: "mewtwo" },
      { value: 0, species: "mewtwo" },
    ]);
  });

  it("tags a two-species page (Ralts) with the right species per energy", () => {
    const r = scan(["1,142", "RALTS CANDY", "330", "RALTS CANDY XL", "60", "GALLADE MEGA ENERGY", "80", "GARDEVOIR MEGA ENERGY"].join("\n"));
    expect(r.candy).toBe(1142);
    expect(r.xlCandy).toBe(330);
    expect(r.megaEnergies).toEqual([
      { value: 60, species: "gallade" },
      { value: 80, species: "gardevoir" },
    ]);
  });

  it("reads a legendary with primal energy", () => {
    const r = scan(["181", "GROUDON CANDY", "82", "GROUDON CANDY XL", "485", "GROUDON PRIMAL ENERGY"].join("\n"));
    expect(r.species).toBe("groudon");
    expect(r.megaEnergies).toEqual([{ value: 485, species: "groudon" }]);
  });
});

describe("chooseSpecies (from candy/energy labels only)", () => {
  const vocab = [
    { key: "mewtwo", name: "MEWTWO" },
    { key: "gardevoir", name: "GARDEVOIR" },
    { key: "groudon", name: "GROUDON" },
  ];

  it("matches the roster off the labels, energy (form) preferred", () => {
    // Ralts: Gallade not a target, Gardevoir is -> picks gardevoir.
    expect(chooseSpecies(["gallade", "gardevoir"], ["ralts"], vocab)).toEqual({ key: "gardevoir", name: "gallade" });
    expect(chooseSpecies(["mewtwo", "mewtwo"], ["mewtwo"], vocab)).toEqual({ key: "mewtwo", name: "mewtwo" });
  });

  it("returns the read name with no key when it isn't a raid target", () => {
    // Charizard isn't in the roster — still named (for the warning), key null.
    expect(chooseSpecies(["charizard", "charizard"], ["charmander"], vocab)).toEqual({ key: null, name: "charizard" });
  });
});

describe("energyForBosses (species-aware association)", () => {
  it("a single boss takes the energy matching its species, not the first", () => {
    const energies = [
      { value: 60, species: "gallade" },
      { value: 80, species: "gardevoir" },
    ];
    expect(energyForBosses(energies, [{ name: "Mega Gardevoir" }])).toEqual([80]);
  });

  it("X/Y bosses (same species) map in reading order", () => {
    const energies = [
      { value: 100, species: "mewtwo" },
      { value: 250, species: "mewtwo" },
    ];
    expect(energyForBosses(energies, [{ name: "Mega Mewtwo X" }, { name: "Mega Mewtwo Y" }])).toEqual([100, 250]);
  });

  it("falls back to the first energy when species is unknown", () => {
    expect(energyForBosses([{ value: 6212, species: null }], [{ name: "Mega Metagross" }])).toEqual([6212]);
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
