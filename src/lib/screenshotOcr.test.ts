import { describe, expect, it } from "vitest";
import { aggregateEntries, parseEntriesFromText } from "./screenshotOcr";
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
