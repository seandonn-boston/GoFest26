import { describe, expect, it } from "vitest";
import { fusionEnergyFromScan, type EnergyHit } from "./screenshotScan";
import { energyGoalsFor } from "@/data/energyGoals";

const hit = (e: Partial<EnergyHit>): EnergyHit => ({ value: 0, species: null, ...e });

describe("fusionEnergyFromScan", () => {
  it("tethers Kyurem's two fusion energies by flavor", () => {
    const energies = [
      hit({ value: 640, species: "kyurem", kind: "fusion", flavor: "blaze" }),
      hit({ value: 210, species: "kyurem", kind: "fusion", flavor: "volt" }),
    ];
    const out = fusionEnergyFromScan(energies, "Kyurem", energyGoalsFor("kyurem"));
    expect(out).toEqual({ blaze: 640, volt: 210 });
  });

  it("matches Primal energy by species (shared 'primal' flavor)", () => {
    const energies = [
      hit({ value: 300, species: "groudon", kind: "primal", flavor: "primal" }),
      hit({ value: 120, species: "kyogre", kind: "primal", flavor: "primal" }),
    ];
    expect(fusionEnergyFromScan(energies, "Groudon", energyGoalsFor("groudon"))).toEqual({ primal: 300 });
    expect(fusionEnergyFromScan(energies, "Kyogre", energyGoalsFor("kyogre"))).toEqual({ primal: 120 });
  });

  it("ignores unrelated energies and zero values", () => {
    const energies = [
      hit({ value: 209, species: "charizard", kind: "mega", form: "x" }),
      hit({ value: 0, species: "kyurem", kind: "fusion", flavor: "blaze" }),
    ];
    expect(fusionEnergyFromScan(energies, "Kyurem", energyGoalsFor("kyurem"))).toEqual({});
  });
});
