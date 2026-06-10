import { describe, expect, it } from "vitest";
import { aggregateEntries, chooseSpecies, energyChip, energyForBosses, fuzzyMatchSpecies, numVal, parseByGrid, parseByTextOrder, parseEntries, parseEntriesFromText, speciesAndForm } from "./screenshotOcr";
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
      { value: 0, species: "mewtwo", form: "x" },
      { value: 0, species: "mewtwo", form: "y" },
    ]);
  });

  it("tags Charizard X & Y energy with the form, single-line labels", () => {
    const r = scan(
      ["3,606", "CHARMANDER CANDY", "187", "CHARMANDER CANDY XL", "209", "CHARIZARD X MEGA ENERGY", "211", "CHARIZARD Y MEGA ENERGY"].join("\n"),
    );
    expect(r.megaEnergies).toEqual([
      { value: 209, species: "charizard", form: "x" },
      { value: 211, species: "charizard", form: "y" },
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

  it("sees past a leaked 'Stardust' prefix and still resolves the species", () => {
    // OCR fuses the Stardust label into the candy label: "stardust giratina".
    const v = [...vocab, { key: "giratina", name: "GIRATINA" }];
    expect(chooseSpecies([], ["stardust giratina"], v)).toEqual({ key: "giratina", name: "giratina" });
  });
});

describe("speciesAndForm (energy-keyword label grammar)", () => {
  it("peels the species before 'energy' and a trailing X/Y form", () => {
    expect(speciesAndForm("gallade mega energy")).toEqual({ species: "gallade", form: null });
    expect(speciesAndForm("charizard x mega energy")).toEqual({ species: "charizard", form: "x" });
    expect(speciesAndForm("mewtwo mega energy y")).toEqual({ species: "mewtwo", form: "y" });
    // OCR noise around the keyword shouldn't leak into the species.
    expect(speciesAndForm("MEGA  ENERGY  Gardevoir")).toEqual({ species: "gardevoir", form: null });
  });
});

describe("energyChip (display)", () => {
  it("renders species, form, and value", () => {
    expect(energyChip({ value: 209, species: "charizard", form: "x" })).toBe("Charizard X En 209");
    expect(energyChip({ value: 80, species: "gardevoir" })).toBe("Gardevoir En 80");
    expect(energyChip({ value: 6212, species: null })).toBe("Energy 6,212");
  });
});

describe("energyForBosses (species-aware association)", () => {
  it("maps X/Y energies by the form letter in the boss name", () => {
    const energies = [
      { value: 211, species: "charizard", form: "y" as const },
      { value: 209, species: "charizard", form: "x" as const },
    ];
    // Reading order is Y-then-X here, but the form letters drive the mapping.
    expect(energyForBosses(energies, [{ name: "Mega Charizard X" }, { name: "Mega Charizard Y" }])).toEqual([209, 211]);
  });

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

describe("parseEntries energy labels (word boxes, real OCR path)", () => {
  // A label/number word box; default width ~80, height ~24.
  const b = (text: string, x: number, y: number, w = 80) => ({ text, x0: x, y0: y, x1: x + w, y1: y + 24 });

  it("keeps the energy's own species, not the neighbouring Candy column (Ralts)", () => {
    const words = [
      // Left Candy/XL column.
      b("1142", 150, 300, 70), b("RALTS", 90, 340, 70), b("CANDY", 180, 340),
      b("330", 150, 440, 60), b("RALTS", 90, 480, 70), b("CANDY", 180, 480), b("XL", 280, 480, 36),
      // Right Energy column (two species).
      b("60", 520, 300, 50), b("GALLADE", 470, 340), b("MEGA", 560, 340, 60), b("ENERGY", 650, 340),
      b("80", 520, 440, 50), b("GARDEVOIR", 460, 480, 100), b("MEGA", 580, 480, 60), b("ENERGY", 670, 480),
    ];
    const energies = parseEntries(words).filter((e) => e.kind === "energy");
    expect(energies.map((e) => ({ species: e.species, value: e.value }))).toEqual([
      { species: "gallade", value: 60 },
      { species: "gardevoir", value: 80 },
    ]);
  });

  it("captures a wrapped species line above the keyword as species + form (Charizard X)", () => {
    const words = [
      b("209", 520, 280, 50),
      b("CHARIZARD", 470, 320, 110), b("X", 600, 320, 24),
      b("MEGA", 500, 356, 60), b("ENERGY", 590, 356),
    ];
    const energies = parseEntries(words).filter((e) => e.kind === "energy");
    expect(energies).toHaveLength(1);
    expect(energies[0].species).toBe("charizard");
    expect(energies[0].form).toBe("x");
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

describe("parseByGrid (Stardust anchored by its label)", () => {
  const n = (text: string, x: number, y: number) => ({ text, x0: x, y0: y, x1: x + 60, y1: y + 24 });

  it("anchors on the labelled Stardust even when Candy is the larger number (hoarder)", () => {
    const words = [
      n("1,200", 100, 1000), // Stardust value
      n("STARDUST", 100, 1030), // its label, directly below
      n("5,000", 400, 1000), // Candy > Stardust would fool the max-number heuristic
      n("98", 700, 1000),
    ];
    expect(parseByGrid(words)).toEqual({ candy: 5000, xlCandy: 98, megaEnergies: [] });
  });

  it("accepts a tiny labelled Stardust (new / spent-out account)", () => {
    const words = [n("300", 100, 1000), n("STARDUST", 100, 1030), n("26", 400, 1000), n("27", 700, 1000)];
    expect(parseByGrid(words)).toEqual({ candy: 26, xlCandy: 27, megaEnergies: [] });
  });
});

describe("parseByTextOrder (no word boxes)", () => {
  it("anchors on the largest number (Stardust) and reads forward", () => {
    expect(parseByTextOrder("4724 192 192 1,001,623 23 47 GYMS")).toEqual({ candy: 23, xlCandy: 47, megaEnergies: [] });
    expect(parseByTextOrder("cp 1,001,623 67 12 9,475 7,500 evolve")).toEqual({ candy: 67, xlCandy: 12, megaEnergies: [9475] });
  });
});

describe("numVal (number token parsing)", () => {
  it("reads plain and properly-grouped numbers, tolerating label padding", () => {
    expect(numVal("26")).toBe(26);
    expect(numVal("0")).toBe(0);
    expect(numVal("1,001,623")).toBe(1001623);
    expect(numVal("11,001,623")).toBe(11001623); // OCR-mangled Stardust, no cap
    expect(numVal("CP 4724")).toBe(4724);
    expect(numVal("9,475 XL")).toBe(9475);
  });

  it("rejects malformed grouping and non-numbers", () => {
    expect(numVal("1,2,3")).toBeNull(); // OCR noise, not a real value
    expect(numVal("GYMS")).toBeNull();
    expect(numVal("")).toBeNull();
  });
});

describe("parseEntriesFromText XL detection", () => {
  it("does not promote a candy line to XL on a lone 'X' (Mewtwo X form letter)", () => {
    const e = parseEntriesFromText("100\nMEWTWO CANDY X");
    expect(e).toEqual([{ kind: "candy", species: "mewtwo", value: 100, y: 0 }]);
  });

  it("still recognizes a real XL candy label", () => {
    const e = parseEntriesFromText("27\nMEWTWO CANDY XL");
    expect(e).toEqual([{ kind: "xlCandy", species: "mewtwo", value: 27, y: 0 }]);
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
