import { describe, it, expect } from "vitest";
import { RAID_BOSSES } from "./bosses";

const boss = (id: string) => RAID_BOSSES.find((b) => b.id === id);

describe("RaidBoss base species", () => {
  it("collapses formes to the bare species", () => {
    // Mega forms → the plain species.
    expect(boss("mega-mewtwo-x")?.species).toBe("Mewtwo");
    expect(boss("mega-mewtwo-y")?.species).toBe("Mewtwo");
    expect(boss("mega-tyranitar")?.species).toBe("Tyranitar");
    // Hero / Crowned Forme → just the species name.
    expect(boss("zacian")?.species).toBe("Zacian");
    expect(boss("zamazenta")?.species).toBe("Zamazenta");
  });

  it("keeps distinct species as themselves (not a shared pre-evolution)", () => {
    // Lunala and Solgaleo are their own species — NOT reduced to Cosmog.
    expect(boss("lunala")?.species).toBe("Lunala");
    expect(boss("solgaleo")?.species).toBe("Solgaleo");
  });

  it("populates a non-empty species on every roster boss", () => {
    for (const b of RAID_BOSSES) {
      expect(b.species, b.name).toBeTruthy();
    }
  });
});
