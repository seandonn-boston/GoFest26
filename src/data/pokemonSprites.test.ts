import { describe, it, expect } from "vitest";
import { ATTACKERS } from "./attackers";
import { RAID_BOSSES } from "./bosses";
import { pokemonSearchName } from "@/lib/pokemonSearch";
import { speciesIconUrl } from "./pokemonSprites";

describe("speciesIconUrl coverage", () => {
  it("resolves an icon URL for every attacker/counter species", () => {
    const missing = [...new Set(ATTACKERS.map((a) => a.species))].filter((s) => !speciesIconUrl(s));
    expect(missing, `attacker species with no sprite: ${missing.join(", ")}`).toEqual([]);
  });

  it("resolves an icon URL for every roster boss species", () => {
    const missing = [...new Set(RAID_BOSSES.map((b) => pokemonSearchName(b.name)))].filter((s) => !speciesIconUrl(s));
    expect(missing, `boss species with no sprite: ${missing.join(", ")}`).toEqual([]);
  });
});
