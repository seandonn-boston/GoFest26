import { describe, it, expect } from "vitest";
import {
  counterBreakdown,
  counterSearchSpecies,
  effectiveness,
  CATEGORY_ORDER,
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
    for (const cat of CATEGORY_ORDER) {
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
    for (const cat of CATEGORY_ORDER) {
      for (const c of groups[cat]) expect(c.via).toBe("Fighting");
    }
    expect(groups.mega.length).toBeGreaterThan(0);
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
