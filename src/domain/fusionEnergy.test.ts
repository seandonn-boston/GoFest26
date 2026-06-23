import { describe, expect, it } from "vitest";
import { energyRaidsNeeded, energyRemaining, defaultEnergyGoal } from "./fusionEnergy";
import { energyGoalsFor, ENERGY_GOALS } from "@/data/energyGoals";

describe("fusion / primal energy goals", () => {
  it("computes a raids range from energy-per-raid (best case = most per raid)", () => {
    // 1000 energy, none on hand, 80–140 per raid → ceil(1000/140)=8 .. ceil(1000/80)=13.
    expect(energyRaidsNeeded(0, 1000, { min: 80, max: 140 })).toEqual({ min: 8, max: 13 });
  });

  it("subtracts energy already on hand", () => {
    // 1000 goal − 200 have = 800 → ceil(800/140)=6 .. ceil(800/80)=10.
    expect(energyRaidsNeeded(200, 1000, { min: 80, max: 140 })).toEqual({ min: 6, max: 10 });
  });

  it("needs zero raids once the goal is met (or exceeded)", () => {
    expect(energyRaidsNeeded(1000, 1000, { min: 80, max: 140 })).toEqual({ min: 0, max: 0 });
    expect(energyRaidsNeeded(1200, 1000, { min: 80, max: 140 })).toEqual({ min: 0, max: 0 });
    expect(energyRemaining(1200, 1000)).toBe(0);
    expect(energyRemaining(300, 1000)).toBe(700);
  });

  it("Primal reverts in ~4–5 raids (400 cost, 80–100 per raid)", () => {
    const primal = energyGoalsFor("groudon")[0];
    expect(primal.cost).toBe(400);
    expect(energyRaidsNeeded(0, primal.cost, primal.perRaid)).toEqual({ min: 4, max: 5 });
  });

  it("Kyurem offers two fusion energies (Blaze + Volt), each costing 1000", () => {
    const goals = energyGoalsFor("kyurem");
    expect(goals.map((g) => g.flavor).sort()).toEqual(["blaze", "volt"]);
    expect(goals.every((g) => g.cost === 1000)).toBe(true);
    expect(defaultEnergyGoal(goals[0])).toBe(1000);
  });

  it("only the six fusion/primal species carry energy goals", () => {
    expect(Object.keys(ENERGY_GOALS).sort()).toEqual(
      ["groudon", "kyogre", "kyurem", "necrozma", "zacian", "zamazenta"].sort(),
    );
    expect(energyGoalsFor("mega-charizard-x")).toEqual([]);
  });
});
