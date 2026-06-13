import { describe, it, expect } from "vitest";
import { pokemonSearchName, buildSearchString, buildMegaSearchString } from "./pokemonSearch";

describe("pokemonSearchName", () => {
  it("strips every variant qualifier down to the bare species", () => {
    expect(pokemonSearchName("Shadow Swampert")).toBe("Swampert");
    expect(pokemonSearchName("Galarian Darmanitan")).toBe("Darmanitan");
    expect(pokemonSearchName("Primal Kyogre")).toBe("Kyogre");
    expect(pokemonSearchName("Mega Charizard Y")).toBe("Charizard");
    expect(pokemonSearchName("Mega Mewtwo X")).toBe("Mewtwo");
    expect(pokemonSearchName("Origin Forme Giratina")).toBe("Giratina");
    expect(pokemonSearchName("Giratina (Origin)")).toBe("Giratina");
    expect(pokemonSearchName("Hisuian Avalugg")).toBe("Avalugg");
  });

  it("leaves plain / multi-word species untouched", () => {
    expect(pokemonSearchName("Tapu Lele")).toBe("Tapu Lele");
    expect(pokemonSearchName("Ho-Oh")).toBe("Ho-Oh");
    expect(pokemonSearchName("Feraligatr")).toBe("Feraligatr");
  });
});

describe("buildSearchString", () => {
  it("collapses Shadow/Mega/plain forms of a species to one species term", () => {
    const list = buildSearchString(["Shadow Swampert", "Mega Swampert", "Swampert", "Shadow Feraligatr", "Feraligatr"]);
    expect(list).toBe("Swampert, Feraligatr");
  });

  it("mega string is species-only, deduped, with the mega3 filter", () => {
    expect(buildMegaSearchString(["Charizard", "Charizard", "Venusaur"])).toBe("Charizard, Venusaur & mega3");
    expect(buildMegaSearchString([])).toBe("");
  });
});
