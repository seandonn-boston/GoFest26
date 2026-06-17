import { describe, it, expect } from "vitest";
import { megaBoostsForBoss, blockMegaBoosts, megaBoostSpecies } from "./megaBoosts";

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

  it("flags a type-sharing super-effective mega as an 'attacker' and ranks it first", () => {
    const boosts = megaBoostsForBoss(["Dragon", "Flying"]);
    const ray = boosts.find((b) => b.mega.name === "Mega Rayquaza");
    expect(ray?.kind).toBe("attacker"); // Dragon is super-effective vs Dragon
    // Attacker tier sorts above wild/boss tiers.
    expect(boosts[0].kind).toBe("attacker");
  });

  it("flags 'wild' when a non-attacker shares a featured wild-spawn type", () => {
    const boosts = megaBoostsForBoss(["Psychic"], ["Steel"]);
    const meta = boosts.find((b) => b.mega.name === "Mega Metagross"); // Steel/Psychic
    expect(meta?.kind).toBe("wild");
    const ala = boosts.find((b) => b.mega.name === "Mega Alakazam"); // pure Psychic
    expect(ala?.kind).toBe("boss");
    // wild outranks boss.
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
    expect(ranked[0].kind).toBe("attacker");
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

describe("megaBoostSpecies", () => {
  it("dedupes to species names in rank order", () => {
    const boosts = megaBoostsForBoss(["Psychic", "Fighting"]); // includes both Mewtwo formes
    const species = megaBoostSpecies(boosts);
    expect(new Set(species).size).toBe(species.length); // no dupes
    expect(species).toContain("Mewtwo");
  });
});
