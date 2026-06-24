import { describe, it, expect } from "vitest";
import {
  counterBreakdown,
  counterSearchSpecies,
  topBlockCounters,
  effectiveness,
  COUNTER_CATEGORIES,
} from "./counters";

describe("effectiveness (dual-type product)", () => {
  it("stacks to a double weakness", () => {
    // Rock vs Fire/Flying (e.g. Moltres): 1.6 × 1.6 = 2.56.
    expect(effectiveness("Rock", ["Fire", "Flying"])).toBeCloseTo(2.56);
  });

  it("cancels a super-effective hit against a resisting second type", () => {
    // Fighting is SE on Normal but resisted by Fairy → neutral on Normal/Fairy.
    expect(effectiveness("Fighting", ["Normal", "Fairy"])).toBeCloseTo(1.0);
  });

  it("models Pokémon GO double-resistances, not main-series immunities", () => {
    // No type does zero damage in PoGo: former immunities are 0.390625×.
    expect(effectiveness("Normal", ["Ghost"])).toBeCloseTo(0.390625);
    expect(effectiveness("Ground", ["Flying"])).toBeCloseTo(0.390625);
    expect(effectiveness("Psychic", ["Dark"])).toBeCloseTo(0.390625);
    // A real single-resist stays at 0.625×, distinctly above the double-resist.
    expect(effectiveness("Fire", ["Water"])).toBeCloseTo(0.625);
    // Dual: Ground SE on Steel but doubly-resisted by Flying (Skarmory-like).
    // Main series would be 0 (immune); PoGo is 1.6 × 0.390625 = 0.625.
    expect(effectiveness("Ground", ["Steel", "Flying"])).toBeCloseTo(0.625);
  });
});

describe("counterBreakdown", () => {
  it("derives dual-type weaknesses correctly for Mewtwo X (Psychic/Fighting)", () => {
    const { weaknesses } = counterBreakdown(["Psychic", "Fighting"]);
    const types = weaknesses.map((w) => w.type).sort();
    // Ghost/Flying/Fairy survive the product; Dark and Bug are cancelled out.
    expect(types).toEqual(["Fairy", "Flying", "Ghost"]);
  });

  it("uses pure-Psychic weaknesses for Mewtwo Y", () => {
    const { weaknesses } = counterBreakdown(["Psychic"]);
    expect(weaknesses.map((w) => w.type).sort()).toEqual(["Bug", "Dark", "Ghost"]);
  });

  it("returns at most five picks per category, score-ordered", () => {
    const { groups } = counterBreakdown(["Psychic"]);
    for (const cat of COUNTER_CATEGORIES) {
      expect(groups[cat].length).toBeLessThanOrEqual(5);
      const scores = groups[cat].map((c) => c.score);
      expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    }
    // Mega list should be led by a Ghost/Dark attacker, not a Psychic one.
    expect(groups.mega[0].attacker.name).toBe("Mega Gengar");
  });

  it("answers a pure-Normal boss with Fighting attackers only", () => {
    const { weaknesses, groups } = counterBreakdown(["Normal"]);
    expect(weaknesses.map((w) => w.type)).toEqual(["Fighting"]);
    // Every pick must be super-effective via a Fighting move.
    for (const cat of COUNTER_CATEGORIES) {
      for (const c of groups[cat]) expect(c.via).toBe("Fighting");
    }
    expect(groups.mega.length).toBeGreaterThan(0);
  });
});

describe("counter categories (5-bucket split)", () => {
  it("splits legendary shadows into shadowLegendary, keeping shadow & legendary clean", () => {
    const { groups } = counterBreakdown(["Dragon"]);
    const names = (cat: "shadow" | "shadowLegendary" | "legendary") => groups[cat].map((c) => c.attacker.name);
    // Shadow Rayquaza (a Legendary's shadow) lands in shadowLegendary…
    expect(names("shadowLegendary")).toContain("Shadow Rayquaza");
    // …not in the plain Shadow bucket, which holds only non-legendary shadows.
    expect(names("shadow")).not.toContain("Shadow Rayquaza");
    expect(names("shadow").every((n) => n.startsWith("Shadow"))).toBe(true);
    // The Legendary bucket never contains a Shadow form.
    expect(names("legendary").some((n) => n.startsWith("Shadow"))).toBe(false);
  });
});

describe("counterSearchSpecies", () => {
  it("dedupes to final-evolution species across bosses", () => {
    const species = counterSearchSpecies([["Psychic"], ["Dark"]]);
    expect(new Set(species).size).toBe(species.length);
    // Shadow/Mega/regular Gengar all collapse to one "Gengar" entry.
    expect(species.filter((s) => s === "Gengar")).toHaveLength(1);
    // Sorted alphabetically.
    expect([...species].sort((a, b) => a.localeCompare(b))).toEqual(species);
  });
});

describe("topBlockCounters", () => {
  it("ranks by how many of the block's raids each attacker is super-effective against", () => {
    // Two Psychic bosses + one Dark boss. A Dark/Ghost attacker (e.g. Tyranitar
    // via Dark, Gengar via Ghost) is super-effective against all three; a pure
    // Fighting attacker only hits the Dark one's Psychic siblings, etc.
    const ranked = topBlockCounters([["Psychic"], ["Psychic"], ["Dark"]]);
    expect(ranked.length).toBeGreaterThan(0);
    // Descending coverage, and coverage never exceeds the boss count.
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].bossesCovered).toBeGreaterThanOrEqual(ranked[i].bossesCovered);
    }
    expect(ranked[0].bossesCovered).toBeLessThanOrEqual(3);
    expect(ranked[0].bossesCovered).toBeGreaterThanOrEqual(2);
  });

  it("breaks ties by attack power (higher max eDPS wins)", () => {
    const ranked = topBlockCounters([["Dragon"]]);
    // Within the top run sharing the same coverage, power must be non-increasing.
    const top = ranked.filter((c) => c.bossesCovered === ranked[0].bossesCovered);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].power).toBeGreaterThanOrEqual(top[i].power);
    }
  });

  it("dedupes to one entry per species and returns nothing for typeless blocks", () => {
    const ranked = topBlockCounters([["Water"], ["Fire"]]);
    const species = ranked.map((c) => c.attacker.species.toLowerCase());
    expect(new Set(species).size).toBe(species.length);
    expect(topBlockCounters([[]])).toEqual([]);
  });
});
