import { describe, expect, it } from "vitest";
import {
  assembleScan,
  chooseSpecies,
  classifyLabel,
  energyChip,
  energyForBosses,
  fuzzyMatchSpecies,
  numVal,
  parseScreen,
  parseScreenText,
  scanFromWords,
  type Word,
} from "./screenshotScan";
import { buildSearchString, pokemonSearchName, speciesKey } from "./pokemonSearch";
import { RAID_BOSSES } from "@/data";

// A word box; stat labels are ~20px tall in these fixtures, values sit ~40px
// above their label (the real screens' proportions).
const b = (text: string, x: number, y: number, w = 80, h = 20): Word => ({
  text,
  x0: x,
  y0: y,
  x1: x + w,
  y1: y + h,
});

const scanWords = (words: Word[]) => assembleScan(parseScreen(words), 0);
const scanText = (text: string) => assembleScan(parseScreenText(text), 0);

// ---------------------------------------------------------------------------
// Layout fixtures mirroring the real screenshot corpus
// ---------------------------------------------------------------------------

describe("parseScreen — real screenshot layouts", () => {
  it("Mew: Stardust + Candy only (no XL); Power-Up cost numbers are never read", () => {
    const r = scanWords([
      b("1,028,556", 100, 1000, 110),
      b("19", 470, 1000, 30),
      b("STARDUST", 95, 1040, 95),
      b("MEW", 420, 1040, 45),
      b("CANDY", 475, 1040, 70),
      // POWER UP row: unlabeled cost numbers that v1's grid misread as XL+energy.
      b("POWER", 60, 1200, 70),
      b("UP", 140, 1200, 30),
      b("1,900", 380, 1200, 60),
      b("2", 530, 1200, 15),
    ]);
    expect(r.stardust).toBe(1028556);
    expect(r.candy).toBe(19);
    expect(r.xlCandy).toBeUndefined();
    expect(r.megaEnergies).toEqual([]);
    expect(r.detectedName).toBe("mew");
    expect(r.species).toBeNull(); // Mew isn't a raid target
    expect(r.readAnything).toBe(true);
    expect(r.looksLikePogo).toBe(true);
  });

  it("Dialga: three columns in ONE row, candy can be 0", () => {
    const r = scanWords([
      b("1,028,556", 60, 1000, 110),
      b("0", 330, 1000, 14),
      b("588", 520, 1000, 40),
      b("STARDUST", 55, 1040, 90),
      b("DIALGA", 260, 1040, 70),
      b("CANDY", 340, 1040, 65),
      b("DIALGA", 450, 1040, 70),
      b("CANDY", 530, 1040, 65),
      b("XL", 605, 1040, 25),
    ]);
    expect(r.candy).toBe(0);
    expect(r.xlCandy).toBe(588);
    expect(r.species).toBe("dialga");
  });

  it("Flapple: 3×2 grid, three apple items, wrapped 'APPLIN CANDY / XL'", () => {
    const r = scanWords([
      b("1,028,556", 55, 940, 110),
      b("236", 310, 940, 40),
      b("119", 530, 940, 40),
      b("STARDUST", 60, 980, 90),
      b("APPLIN", 255, 980, 70),
      b("CANDY", 333, 980, 65),
      b("APPLIN", 465, 980, 70),
      b("CANDY", 543, 980, 65),
      b("XL", 545, 1006, 25),
      b("19", 105, 1080, 25),
      b("27", 320, 1080, 25),
      b("5", 540, 1080, 14),
      b("SWEET", 55, 1120, 60),
      b("APPLE", 123, 1120, 60),
      b("TART", 285, 1120, 50),
      b("APPLE", 343, 1120, 60),
      b("SYRUPY", 480, 1120, 70),
      b("APPLE", 558, 1120, 60),
    ]);
    expect(r.candy).toBe(236);
    expect(r.xlCandy).toBe(119);
    expect(r.megaEnergies).toEqual([]);
    expect(r.items).toEqual([
      { name: "Sweet Apple", value: 19 },
      { name: "Tart Apple", value: 27 },
      { name: "Syrupy Apple", value: 5 },
    ]);
    expect(r.detectedName).toBe("applin");
    expect(r.species).toBeNull();
  });

  it("Kyurem: two FUSION energies imply the species (no Pokémon word in the label)", () => {
    const r = scanWords([
      b("1,028,556", 60, 1000, 110),
      b("4,062", 470, 1000, 60),
      b("STARDUST", 60, 1040, 90),
      b("KYUREM", 410, 1040, 75),
      b("CANDY", 495, 1040, 65),
      b("339", 130, 1100, 40),
      b("1,420", 450, 1100, 55),
      b("KYUREM", 55, 1140, 75),
      b("CANDY", 140, 1140, 65),
      b("XL", 215, 1140, 25),
      b("VOLT", 390, 1140, 50),
      b("FUSION", 450, 1140, 70),
      b("ENERGY", 530, 1140, 75),
      b("1,280", 290, 1200, 55),
      b("BLAZE", 200, 1240, 60),
      b("FUSION", 270, 1240, 70),
      b("ENERGY", 350, 1240, 75),
    ]);
    expect(r.candy).toBe(4062);
    expect(r.xlCandy).toBe(339);
    expect(r.megaEnergies).toEqual([
      { value: 1420, species: "kyurem", flavor: "volt" },
      { value: 1280, species: "kyurem", flavor: "blaze" },
    ]);
    expect(r.species).toBe("kyurem");
  });

  it("Zamazenta: wrapped 'CROWNED SHIELD / ENERGY' implies the species", () => {
    const r = scanWords([
      b("310", 480, 1000, 40),
      b("ZAMAZENTA", 400, 1040, 105),
      b("CANDY", 515, 1040, 65),
      b("44", 130, 1100, 25),
      b("825", 470, 1100, 40),
      b("ZAMAZENTA", 40, 1140, 105),
      b("CANDY", 155, 1140, 65),
      b("XL", 230, 1140, 25),
      b("CROWNED", 400, 1140, 90),
      b("SHIELD", 500, 1140, 70),
      b("ENERGY", 450, 1166, 75),
    ]);
    expect(r.candy).toBe(310);
    expect(r.xlCandy).toBe(44);
    expect(r.megaEnergies).toEqual([{ value: 825, species: "zamazenta", flavor: "shield" }]);
    expect(r.species).toBe("zamazenta");
  });

  it("shadow Groudon ('Maxie'): wrapped PRIMAL energy; Purify cost numbers ignored", () => {
    const r = scanWords([
      b("181", 460, 1000, 40),
      b("GROUDON", 400, 1040, 90),
      b("CANDY", 500, 1040, 65),
      b("82", 130, 1100, 25),
      b("485", 470, 1100, 40),
      b("GROUDON", 45, 1140, 90),
      b("CANDY", 145, 1140, 65),
      b("XL", 220, 1140, 25),
      b("GROUDON", 395, 1140, 90),
      b("PRIMAL", 495, 1140, 70),
      b("ENERGY", 450, 1166, 75),
      b("PURIFY", 100, 1280, 80),
      b("20,000", 330, 1280, 75),
      b("20", 480, 1280, 25),
    ]);
    expect(r.candy).toBe(181);
    expect(r.xlCandy).toBe(82);
    expect(r.megaEnergies).toEqual([{ value: 485, species: "groudon", flavor: "primal" }]);
    expect(r.species).toBe("groudon");
  });

  it("Kirlia: six cells — two mega energies for different species + an item", () => {
    const r = scanWords([
      b("1,028,556", 60, 1000, 110),
      b("1,142", 460, 1000, 60),
      b("STARDUST", 60, 1040, 90),
      b("RALTS", 420, 1040, 60),
      b("CANDY", 490, 1040, 65),
      b("330", 120, 1100, 40),
      b("60", 480, 1100, 25),
      b("RALTS", 50, 1140, 60),
      b("CANDY", 120, 1140, 65),
      b("XL", 195, 1140, 25),
      b("GALLADE", 380, 1140, 85),
      b("MEGA", 475, 1140, 55),
      b("ENERGY", 540, 1140, 75),
      b("80", 120, 1200, 25),
      b("1", 490, 1200, 12),
      b("GARDEVOIR", 40, 1240, 110),
      b("MEGA", 160, 1240, 55),
      b("ENERGY", 90, 1266, 75),
      b("SINNOH", 400, 1240, 70),
      b("STONE", 480, 1240, 60),
    ]);
    expect(r.candy).toBe(1142);
    expect(r.xlCandy).toBe(330);
    expect(r.megaEnergies).toEqual([
      { value: 60, species: "gallade" },
      { value: 80, species: "gardevoir" },
    ]);
    expect(r.items).toEqual([{ name: "Sinnoh Stone", value: 1 }]);
    expect(r.species).toBe("gardevoir"); // Gallade isn't a target, Gardevoir is
  });

  it("Onix: another species' mega energy + an evolution item (Metal Coat)", () => {
    const r = scanWords([
      b("224", 470, 1000, 40),
      b("ONIX", 410, 1040, 50),
      b("CANDY", 470, 1040, 65),
      b("65", 120, 1100, 25),
      b("1,274", 460, 1100, 60),
      b("ONIX", 50, 1140, 50),
      b("CANDY", 110, 1140, 65),
      b("XL", 185, 1140, 25),
      b("STEELIX", 380, 1140, 80),
      b("MEGA", 470, 1140, 55),
      b("ENERGY", 535, 1140, 75),
      b("75", 300, 1200, 25),
      b("METAL", 250, 1240, 60),
      b("COAT", 320, 1240, 50),
    ]);
    expect(r.candy).toBe(224);
    expect(r.xlCandy).toBe(65);
    expect(r.megaEnergies).toEqual([{ value: 1274, species: "steelix" }]);
    expect(r.items).toEqual([{ name: "Metal Coat", value: 75 }]);
    expect(r.species).toBeNull();
    expect(r.detectedName).toBe("steelix");
  });

  it("scrolled Charizard: Max-Move tiles above, wrapped 'ENERGY X/Y', evolve-row noise", () => {
    const r = scanWords([
      // Max Moves section above the stats (scrolled screenshot).
      b("LEVEL", 290, 660, 60),
      b("2", 360, 660, 15),
      b("MAX", 130, 730, 45),
      b("GUARD", 185, 730, 65),
      // Stats grid.
      b("1,001,623", 100, 840, 110),
      b("3,606", 460, 840, 60),
      b("STARDUST", 95, 880, 95),
      b("CHARMANDER", 380, 880, 120),
      b("CANDY", 510, 880, 65),
      b("187", 130, 930, 40),
      b("209", 470, 930, 40),
      b("CHARMANDER", 30, 970, 120),
      b("CANDY", 160, 970, 65),
      b("XL", 235, 970, 25),
      b("CHARIZARD", 390, 970, 105),
      b("MEGA", 505, 970, 55),
      b("ENERGY", 430, 996, 75),
      b("X", 515, 996, 15),
      b("211", 290, 1056, 40),
      b("CHARIZARD", 220, 1096, 105),
      b("MEGA", 335, 1096, 55),
      b("ENERGY", 260, 1122, 75),
      b("Y", 345, 1122, 15),
      // MEGA EVOLVE buttons with costs + boss-name caption.
      b("MEGA", 100, 1220, 55),
      b("EVOLVE", 165, 1220, 75),
      b("400", 380, 1220, 40),
      b("MEGA", 390, 1290, 55),
      b("CHARIZARD", 455, 1290, 105),
      b("X", 570, 1290, 15),
    ]);
    expect(r.candy).toBe(3606);
    expect(r.xlCandy).toBe(187);
    expect(r.megaEnergies).toEqual([
      { value: 209, species: "charizard", form: "x" },
      { value: 211, species: "charizard", form: "y" },
    ]);
    expect(r.species).toBeNull(); // Charizard isn't in the GO Fest roster
    expect(r.detectedName).toBe("charizard");
  });

  it("zoomed Mewtwo crop: lone wrapped X/Y lines, zero energies, unclaimed evolve cost", () => {
    const r = scanWords([
      b("999,113", 230, 140, 220, 50),
      b("26", 890, 140, 60, 50),
      b("STARDUST", 240, 220, 200, 32),
      b("MEWTWO", 730, 220, 160, 32),
      b("CANDY", 905, 220, 130, 32),
      b("27", 340, 320, 60, 50),
      b("0", 905, 320, 30, 50),
      b("MEWTWO", 165, 400, 160, 32),
      b("CANDY", 340, 400, 130, 32),
      b("XL", 485, 400, 50, 32),
      b("MEWTWO", 660, 400, 160, 32),
      b("MEGA", 835, 400, 100, 32),
      b("ENERGY", 950, 400, 150, 32),
      b("X", 880, 445, 28, 32),
      b("0", 635, 510, 30, 50),
      b("MEWTWO", 390, 590, 160, 32),
      b("MEGA", 565, 590, 100, 32),
      b("ENERGY", 680, 590, 150, 32),
      b("Y", 615, 635, 28, 32),
      b("MEGA", 330, 770, 100, 50),
      b("EVOLVE", 330, 830, 140, 50),
      b("7,500", 740, 800, 130, 50),
    ]);
    expect(r.stardust).toBe(999113);
    expect(r.candy).toBe(26);
    expect(r.xlCandy).toBe(27);
    expect(r.megaEnergies).toEqual([
      { value: 0, species: "mewtwo", form: "x" },
      { value: 0, species: "mewtwo", form: "y" },
    ]);
    expect(r.species).toBe("mewtwo");
  });

  it("PoGo crop with no stats section: looksLikePogo, but nothing readable", () => {
    const r = scanWords([
      b("Caterpie", 250, 100, 120, 30),
      b("12", 270, 170, 30),
      b("12", 320, 170, 30),
      b("HP", 360, 170, 30),
      b("2.07kg", 100, 300, 80),
      b("WEIGHT", 100, 350, 85),
      b("BUG", 300, 350, 45),
      b("0.26m", 480, 300, 70),
      b("HEIGHT", 470, 350, 80),
    ]);
    expect(r.readAnything).toBe(false);
    expect(r.looksLikePogo).toBe(true);
    expect(r.species).toBeNull();
  });

  it("a non-Pokémon-GO image reads as not-PoGo", () => {
    const r = scanWords([
      b("Meeting", 100, 100, 90),
      b("notes", 200, 100, 60),
      b("Lunch", 100, 160, 70),
      b("12", 180, 160, 25),
      b("tomorrow", 220, 160, 100),
    ]);
    expect(r.readAnything).toBe(false);
    expect(r.looksLikePogo).toBe(false);
  });

  it("snippet with a visible label but cropped-off number still identifies the species", () => {
    const r = scanWords([b("MEWTWO", 420, 20, 75), b("CANDY", 505, 20, 65)]);
    expect(r.readAnything).toBe(false);
    expect(r.looksLikePogo).toBe(true);
    expect(r.species).toBe("mewtwo");
  });
});

// ---------------------------------------------------------------------------
// Label grammar
// ---------------------------------------------------------------------------

describe("classifyLabel (resource grammar)", () => {
  it("candy and XL candy, with the species peeled off", () => {
    expect(classifyLabel(["mewtwo", "candy"])).toEqual({ type: "candy", xl: false, species: "mewtwo" });
    expect(classifyLabel(["mewtwo", "candy", "xl"])).toEqual({ type: "candy", xl: true, species: "mewtwo" });
    // A lone trailing "x" (the Mewtwo X form letter) must NOT mean XL.
    expect(classifyLabel(["mewtwo", "candy", "x"])).toEqual({ type: "candy", xl: false, species: "mewtwo" });
  });

  it("mega energy with species and optional X/Y form (any token order)", () => {
    expect(classifyLabel(["gallade", "mega", "energy"])).toEqual({
      type: "energy",
      energyKind: "mega",
      species: "gallade",
      form: null,
      flavor: null,
    });
    expect(classifyLabel(["charizard", "x", "mega", "energy"])).toMatchObject({ species: "charizard", form: "x" });
    expect(classifyLabel(["mewtwo", "mega", "energy", "y"])).toMatchObject({ species: "mewtwo", form: "y" });
  });

  it("primal, fusion and crowned energies (implied species)", () => {
    expect(classifyLabel(["groudon", "primal", "energy"])).toMatchObject({
      energyKind: "primal",
      species: "groudon",
      flavor: "primal",
    });
    expect(classifyLabel(["volt", "fusion", "energy"])).toMatchObject({ species: "kyurem", flavor: "volt" });
    expect(classifyLabel(["blaze", "fusion", "energy"])).toMatchObject({ species: "kyurem", flavor: "blaze" });
    expect(classifyLabel(["solar", "fusion", "energy"])).toMatchObject({ species: "necrozma", flavor: "solar" });
    expect(classifyLabel(["lunar", "fusion", "energy"])).toMatchObject({ species: "necrozma", flavor: "lunar" });
    expect(classifyLabel(["crowned", "sword", "energy"])).toMatchObject({ species: "zacian", flavor: "sword" });
    expect(classifyLabel(["crowned", "shield", "energy"])).toMatchObject({ species: "zamazenta", flavor: "shield" });
  });

  it("evolution items: known table (incl. OCR'd KING'S -> KINGS) and *-stone catch-all", () => {
    expect(classifyLabel(["kings", "rock"])).toEqual({ type: "item", name: "King's Rock" });
    expect(classifyLabel(["sinnoh", "stone"])).toEqual({ type: "item", name: "Sinnoh Stone" });
    expect(classifyLabel(["unova", "stone"])).toEqual({ type: "item", name: "Unova Stone" });
    expect(classifyLabel(["upgrade"])).toEqual({ type: "item", name: "Upgrade" });
    expect(classifyLabel(["zygarde", "cell"])).toEqual({ type: "item", name: "Zygarde Cell" });
    // Unknown-but-itemish phrase via the suffix heuristic.
    expect(classifyLabel(["shiny", "stone"])).toEqual({ type: "item", name: "Shiny Stone" });
  });

  it("UI text is a marker; arbitrary words are nothing", () => {
    expect(classifyLabel(["power", "up"])).toEqual({ type: "marker" });
    expect(classifyLabel(["weight"])).toEqual({ type: "marker" });
    expect(classifyLabel(["mega", "evolve"])).toEqual({ type: "marker" });
    expect(classifyLabel(["stardust"])).toEqual({ type: "stardust" });
    expect(classifyLabel(["lunch"])).toBeNull();
  });

  it("tolerates one OCR edit in keywords", () => {
    expect(classifyLabel(["mewtwo", "candv"])).toMatchObject({ type: "candy" });
    expect(classifyLabel(["slowbro", "mega", "eneray"])).toMatchObject({ type: "energy", species: "slowbro" });
    expect(classifyLabel(["stardus"])).toEqual({ type: "stardust" });
  });
});

// ---------------------------------------------------------------------------
// Text-only fallback
// ---------------------------------------------------------------------------

describe("parseScreenText (no word boxes)", () => {
  it("reads a full Necrozma page with dual fusion energies", () => {
    const r = scanText(
      [
        "1,028,556",
        "STARDUST",
        "100",
        "NECROZMA CANDY",
        "44",
        "NECROZMA CANDY XL",
        "3,120",
        "SOLAR FUSION ENERGY",
        "2,230",
        "LUNAR FUSION ENERGY",
      ].join("\n"),
    );
    expect(r.stardust).toBe(1028556);
    expect(r.candy).toBe(100);
    expect(r.xlCandy).toBe(44);
    expect(r.megaEnergies).toEqual([
      { value: 3120, species: "necrozma", flavor: "solar" },
      { value: 2230, species: "necrozma", flavor: "lunar" },
    ]);
    expect(r.species).toBe("necrozma");
  });

  it("attaches lone wrapped X / Y lines to the energy above", () => {
    const r = scanText(
      ["26", "MEWTWO CANDY", "27", "MEWTWO CANDY XL", "0", "MEWTWO MEGA ENERGY", "X", "0", "MEWTWO MEGA ENERGY", "Y"].join("\n"),
    );
    expect(r.candy).toBe(26);
    expect(r.xlCandy).toBe(27);
    expect(r.megaEnergies).toEqual([
      { value: 0, species: "mewtwo", form: "x" },
      { value: 0, species: "mewtwo", form: "y" },
    ]);
    expect(r.species).toBe("mewtwo");
  });

  it("attaches a lone wrapped XL line to the candy above", () => {
    const r = scanText(["236", "APPLIN CANDY", "119", "APPLIN CANDY", "XL"].join("\n"));
    expect(r.candy).toBe(236);
    expect(r.xlCandy).toBe(119);
  });

  it("stitches a wrapped species prefix line onto the energy keyword line", () => {
    const r = scanText(["209", "CHARIZARD MEGA", "ENERGY X"].join("\n"));
    expect(r.megaEnergies).toEqual([{ value: 209, species: "charizard", form: "x" }]);
  });

  it("scanFromWords falls back to text parsing when no boxes exist", () => {
    const r = scanFromWords([], "26\nMEWTWO CANDY", 0);
    expect(r.candy).toBe(26);
    expect(r.species).toBe("mewtwo");
  });
});

// ---------------------------------------------------------------------------
// Species resolution
// ---------------------------------------------------------------------------

describe("chooseSpecies (from candy/energy labels only)", () => {
  const vocab = [
    { key: "mewtwo", name: "MEWTWO" },
    { key: "gardevoir", name: "GARDEVOIR" },
    { key: "groudon", name: "GROUDON" },
  ];

  it("matches the roster off the labels, energy (evolved form) preferred", () => {
    expect(chooseSpecies(["gallade", "gardevoir"], ["ralts"], vocab)).toEqual({ key: "gardevoir", name: "gallade" });
    expect(chooseSpecies(["mewtwo", "mewtwo"], ["mewtwo"], vocab)).toEqual({ key: "mewtwo", name: "mewtwo" });
  });

  it("returns the read name with no key when it isn't a raid target", () => {
    expect(chooseSpecies(["charizard", "charizard"], ["charmander"], vocab)).toEqual({ key: null, name: "charizard" });
  });

  it("sees past a leaked 'Stardust' prefix and still resolves the species", () => {
    const v = [...vocab, { key: "giratina", name: "GIRATINA" }];
    expect(chooseSpecies([], ["stardust giratina"], v)).toEqual({ key: "giratina", name: "giratina" });
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
    expect(fuzzyMatchSpecies("TYRANITAR MEGA ENERGY 209", vocab)).toBe("tyranitar");
  });

  it("returns null for garbage that isn't close to any species", () => {
    expect(fuzzyMatchSpecies("cr4d 724 OF Ares HP kg", vocab)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Display + boss association
// ---------------------------------------------------------------------------

describe("energyChip (display)", () => {
  it("renders species, form/flavor qualifier, and value", () => {
    expect(energyChip({ value: 209, species: "charizard", form: "x" })).toBe("Charizard X En 209");
    expect(energyChip({ value: 80, species: "gardevoir" })).toBe("Gardevoir En 80");
    expect(energyChip({ value: 1420, species: "kyurem", flavor: "volt" })).toBe("Kyurem Volt En 1,420");
    expect(energyChip({ value: 485, species: "groudon", flavor: "primal" })).toBe("Groudon Primal En 485");
    expect(energyChip({ value: 6212, species: null })).toBe("Energy 6,212");
  });
});

describe("energyForBosses (species-aware association)", () => {
  it("maps X/Y energies by the form letter in the boss name", () => {
    const energies = [
      { value: 211, species: "charizard", form: "y" as const },
      { value: 209, species: "charizard", form: "x" as const },
    ];
    expect(energyForBosses(energies, [{ name: "Mega Charizard X" }, { name: "Mega Charizard Y" }])).toEqual([209, 211]);
  });

  it("a single boss takes the energy matching its species, not the first", () => {
    const energies = [
      { value: 60, species: "gallade" },
      { value: 80, species: "gardevoir" },
    ];
    expect(energyForBosses(energies, [{ name: "Mega Gardevoir" }])).toEqual([80]);
  });

  it("X/Y bosses (same species) map in reading order without form letters", () => {
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

// ---------------------------------------------------------------------------
// Number tokens & roster sanity
// ---------------------------------------------------------------------------

describe("numVal (number token parsing)", () => {
  it("reads plain and properly-grouped numbers, tolerating label padding", () => {
    expect(numVal("26")).toBe(26);
    expect(numVal("0")).toBe(0);
    expect(numVal("1,001,623")).toBe(1001623);
    expect(numVal("11,001,623")).toBe(11001623); // OCR-mangled Stardust, no cap
    expect(numVal("CP 4724")).toBe(4724);
    expect(numVal("9,475 XL")).toBe(9475);
  });

  it("rejects malformed grouping, decimals and non-numbers", () => {
    expect(numVal("1,2,3")).toBeNull(); // OCR noise, not a real value
    expect(numVal("2.07kg")).toBeNull(); // weight, not a count
    expect(numVal("GYMS")).toBeNull();
    expect(numVal("")).toBeNull();
  });
});

describe("species matching against the roster", () => {
  const keys = new Set(RAID_BOSSES.map((b) => speciesKey(b.name)));

  it("matches raid targets and flags non-targets", () => {
    expect(keys.has("groudon")).toBe(true);
    expect(keys.has("mewtwo")).toBe(true);
    expect(keys.has("kyurem")).toBe(true);
    expect(keys.has("necrozma")).toBe(true);
    expect(keys.has("zacian")).toBe(true);
    expect(keys.has("zamazenta")).toBe(true);
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
