import { describe, it, expect } from "vitest";
import { megaBoostsForBoss, blockMegaBoosts, topBlockMegas, megaBoostSpecies, megaTier } from "./megaBoosts";

describe("megaTier (boss-type / wild-type / attacker → colour)", () => {
  it("maps every signal combination", () => {
    expect(megaTier(true, true, true)).toBe("rainbow");
    expect(megaTier(true, true, false)).toBe("gold");
    expect(megaTier(true, false, true)).toBe("silver");
    expect(megaTier(false, true, true)).toBe("bronze");
    expect(megaTier(true, false, false)).toBe("boss");
    expect(megaTier(false, true, false)).toBe("wild");
    expect(megaTier(false, false, true)).toBe("attacker");
  });
});

const names = (b: { mega: { name: string } }[]) => b.map((x) => x.mega.name);

describe("megaBoostsForBoss", () => {
  it("only suggests megas that SHARE a type with the boss (same-type candy bonus)", () => {
    const boosts = megaBoostsForBoss(["Psychic"]);
    // Psychic-typed megas qualify…
    expect(names(boosts)).toContain("Mega Alakazam");
    expect(names(boosts)).toContain("Mega Mewtwo Y");
    // …a strong off-type counter like Mega Gengar (Ghost/Poison) does NOT — it
    // grants no Psychic candy, so it's a counter, not a candy-boost mega.
    expect(names(boosts)).not.toContain("Mega Gengar");
    // Every suggestion genuinely shares a type with the boss.
    expect(boosts.every((b) => b.mega.types.includes("Psychic"))).toBe(true);
  });

  it("flags a type-sharing super-effective mega as 'silver' (boss-type + attacker) and ranks it first", () => {
    const boosts = megaBoostsForBoss(["Dragon", "Flying"]); // no wild types passed
    const ray = boosts.find((b) => b.mega.name === "Mega Rayquaza");
    expect(ray?.kind).toBe("silver"); // shares Dragon AND Dragon is super-effective vs Dragon
    // Silver (boss-type + attacker) sorts above plain boss-type.
    expect(boosts[0].kind).toBe("silver");
  });

  it("flags 'gold' when a non-attacker shares both the boss type and a wild-spawn type", () => {
    const boosts = megaBoostsForBoss(["Psychic"], ["Steel"]);
    const meta = boosts.find((b) => b.mega.name === "Mega Metagross"); // Steel/Psychic, not SE vs Psychic
    expect(meta?.kind).toBe("gold"); // boss type (Psychic) + wild type (Steel), no attacker
    const ala = boosts.find((b) => b.mega.name === "Mega Alakazam"); // pure Psychic, boss type only
    expect(ala?.kind).toBe("boss");
    // gold outranks plain boss.
    expect(meta!.score).toBeGreaterThan(ala!.score);
  });

  it("returns nothing for a typeless/empty boss", () => {
    expect(megaBoostsForBoss([])).toEqual([]);
  });
});

describe("blockMegaBoosts", () => {
  it("ranks the mega that fights, candy-matches the most targets, and matches the wild theme first", () => {
    // Dragonflight Summit: dragon-dominant targets, dragon/flying/rock wilds —
    // Mega Rayquaza fights most of them, candy-matches all, and matches the theme.
    const wild = ["Flying", "Rock", "Dragon"];
    const bosses = [["Dragon"], ["Dragon", "Flying"], ["Dragon"], ["Dragon", "Ground"], ["Rock", "Dragon"]];
    const ranked = blockMegaBoosts(wild, bosses);
    expect(ranked[0].mega.name).toBe("Mega Rayquaza");
    // Shares a boss type, matches the wild theme, AND fights → all three = rainbow.
    expect(ranked[0].kind).toBe("rainbow");
  });

  it("excludes megas that boost no target in the block", () => {
    const ranked = blockMegaBoosts([], [["Fairy"]]);
    // Every match genuinely shares the boss's type; an off-type mega like the
    // pure-Normal Mega Kangaskhan must not appear.
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((b) => b.mega.types.includes("Fairy"))).toBe(true);
    expect(names(ranked)).not.toContain("Mega Kangaskhan");
  });

  it("suggests EVERY type-sharing mega, including candy-boost-only ones (not just attackers)", () => {
    // Normal bosses (e.g. Regigigas) boost all Normal-typed megas, not only the
    // attacker-pool Mega Pidgeot.
    const boosts = megaBoostsForBoss(["Normal"]);
    const n = names(boosts);
    expect(n).toEqual(expect.arrayContaining(["Mega Pidgeot", "Mega Kangaskhan", "Mega Lopunny", "Mega Audino"]));
    expect(boosts.every((b) => b.mega.types.includes("Normal"))).toBe(true);
  });
});

describe("topBlockMegas", () => {
  // Dragonflight Summit again: dragon-heavy bosses, dragon/flying/rock wilds.
  const wild = ["Flying", "Rock", "Dragon"];
  const bosses = [["Dragon"], ["Dragon", "Flying"], ["Dragon"], ["Dragon", "Ground"], ["Rock", "Dragon"]];

  it("ranks the mega with the best weighted coverage/wild/attacker blend first", () => {
    const ranked = topBlockMegas(wild, bosses);
    // Mega Rayquaza (Dragon/Flying) shares a type with all five, fights them
    // super-effectively, and matches the Flying + Dragon wild theme → top.
    expect(ranked[0].mega.name).toBe("Mega Rayquaza");
    expect(ranked[0].kind).toBe("rainbow"); // boss type + wild theme + attacker
    expect(ranked[0].bossesBoosted).toBe(5);
    expect(ranked[0].wildMatches).toBe(2); // Dragon + Flying
  });

  it("caps the list at five (or the requested limit) and sorts by descending score", () => {
    const ranked = topBlockMegas(wild, bosses);
    expect(ranked.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
    }
    expect(topBlockMegas(wild, bosses, { limit: 3 }).length).toBeLessThanOrEqual(3);
  });

  it("counts a same-type super-effective boss as coverage +2, an off-type counter as +1", () => {
    // A single pure-Dragon boss: Mega Rayquaza shares Dragon AND hits it
    // super-effectively → coverage 2, one same-type attacker hit, no off-type.
    const ranked = topBlockMegas([], [["Dragon"]]);
    const ray = ranked.find((m) => m.mega.name === "Mega Rayquaza");
    expect(ray?.coverage).toBe(2);
    expect(ray?.attackerSameType).toBe(1);
    expect(ray?.attackerOffType).toBe(0);
  });

  it("breaks ties toward the mega of the higher-priority target", () => {
    // Mega Kangaskhan (Normal) and Mega Audino (Normal/Fairy) are both candy-only
    // boosts that share Normal with these bosses but counter neither — identical
    // component vectors, so their scores tie and priority order decides.
    const normalBosses = [["Normal"], ["Normal"]];
    const a = topBlockMegas([], normalBosses, { prioritySpecies: ["Kangaskhan", "Audino"] });
    const b = topBlockMegas([], normalBosses, { prioritySpecies: ["Audino", "Kangaskhan"] });
    const idx = (r: { mega: { species: string } }[], s: string) => r.findIndex((x) => x.mega.species === s);
    expect(idx(a, "Kangaskhan")).toBeLessThan(idx(a, "Audino"));
    expect(idx(b, "Audino")).toBeLessThan(idx(b, "Kangaskhan"));
  });

  it("returns nothing when no mega boosts any candy or wild spawn", () => {
    expect(topBlockMegas([], [[]])).toEqual([]);
  });
});

describe("megaBoostSpecies", () => {
  it("dedupes to species names in rank order", () => {
    const boosts = megaBoostsForBoss(["Psychic", "Fighting"]); // includes both Mewtwo formes
    const species = megaBoostSpecies(boosts);
    expect(new Set(species).size).toBe(species.length); // no dupes
    expect(species).toContain("Mewtwo");
  });
});
