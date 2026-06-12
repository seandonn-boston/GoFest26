import { describe, it, expect } from "vitest";
import { computeBlockPlan, bandsForSpecies, rareCandyForecast, RISK_BANDS } from "./blockPlan";
import { computeCapacity } from "./capacity";
import { makeDefaultInput } from "./defaults";
import { computeBossResult } from "./raidsNeeded";
import { computeGrossRequirement } from "./requirements";
import { DEFAULT_SETTINGS, MAX_REMOTE_RAIDS } from "./settings";
import { bossIsLocal } from "./region";
import { getBoss, MEWTWO_X_ID, MEWTWO_Y_ID, SORTED_BOSSES } from "@/data";
import { HABITATS } from "@/data/habitats";
import type { BossInput, BossResult, Range } from "./types";

const sum = (b: Record<string, number>) => RISK_BANDS.reduce((s, k) => s + b[k], 0);

// A roomy capacity so nothing falls into grey unless we mean it to.
const ROOMY = computeCapacity({ ...DEFAULT_SETTINGS, lobbySize: 20, quickCatch: true });

describe("quantity scaling (requirements ×N)", () => {
  const boss = getBoss(MEWTWO_X_ID)!;

  it("scales every gross currency by the quantity", () => {
    const base: BossInput = {
      ...makeDefaultInput(boss),
      current: { candy: 0, xlCandy: 0, megaEnergy: 0, level: 40, megaLevel: 0 },
      target: { level: 50, megaLevel: 4 },
      quantity: 1,
    };
    const one = computeGrossRequirement(boss, base);
    const two = computeGrossRequirement(boss, { ...base, quantity: 2 });
    for (const k of Object.keys(one) as (keyof typeof one)[]) {
      expect(two[k]).toBe((one[k] ?? 0) * 2);
    }
    // And it must actually touch mega energy, XL, and candy here.
    expect(one.megaEnergy).toBeGreaterThan(0);
    expect(one.xlCandy).toBeGreaterThan(0);
  });

  it("defaults to ×1 when quantity is absent", () => {
    const input = { ...makeDefaultInput(boss), quantity: undefined } as BossInput;
    const withExplicit = computeGrossRequirement(boss, { ...input, quantity: 1 });
    expect(computeGrossRequirement(boss, input)).toEqual(withExplicit);
  });
});

describe("bandsForSpecies — dynamic ranges + 5:3:2 spread", () => {
  const huge: Range = { min: 9999, max: 9999 }; // all positions within guaranteed time

  it("puts the candy-lucky floor in blue and spreads the uncertain 5:3:2", () => {
    // 10 sure + 10 uncertain → 10 blue, then 5 green / 3 yellow / 2 red (all fit).
    const b = bandsForSpecies(20, 20, { min: 10, max: 30 }, 0, huge);
    expect(b.blue).toBe(10);
    expect(b.green).toBe(5);
    expect(b.yellow).toBe(3);
    expect(b.red).toBe(2);
    expect(sum(b)).toBe(20);
  });

  it("colors only the fitted raids, cutting the least-certain (red) tail first", () => {
    // demand 10 (2 blue + 8 uncertain → 4 green/2 yellow/2 red) but only 5 fit.
    const b = bandsForSpecies(5, 10, { min: 2, max: 18 }, 0, huge);
    expect(b.blue).toBe(2);
    expect(b.green).toBe(3);
    expect(b.yellow).toBe(0);
    expect(b.red).toBe(0);
    expect(sum(b)).toBe(5); // never exceeds what fit
  });

  it("downgrades guaranteed-need raids out of blue once past guaranteed time", () => {
    // All 10 are sure-need and fit, but only the first 4 sit within guaranteed time.
    const b = bandsForSpecies(10, 10, { min: 10, max: 10 }, 0, { min: 4, max: 20 });
    expect(b.blue).toBe(4);
    expect(b.green).toBe(6);
  });
});

/** Selected inputs + their results for a set of boss ids, all at default goals. */
function buildFor(ids: string[]): { inputs: BossInput[]; results: BossResult[] } {
  const inputs = ids.map((id) => makeDefaultInput(getBoss(id)!));
  const results = inputs.map((i) => computeBossResult(getBoss(i.bossId)!, i));
  return { inputs, results };
}

const isMewtwo = (id: string) => id === MEWTWO_X_ID || id === MEWTWO_Y_ID;
const SINGLE_BLOCK = SORTED_BOSSES.filter(
  (b) => !isMewtwo(b.id) && b.windows.length === 1 && b.windows[0].endHour - b.windows[0].startHour === 3,
);

describe("computeBlockPlan — allocation", () => {
  it("pins a fixed-window boss to the habitat block it spawns in", () => {
    const sat0 = SINGLE_BLOCK.find((b) => b.windows[0].day === "sat" && b.windows[0].startHour === 0)!;
    const { inputs, results } = buildFor([sat0.id]);
    const plan = computeBlockPlan(inputs, results, ROOMY, DEFAULT_SETTINGS, []);
    const carrying = plan.blocks.filter((b) => b.species.some((s) => s.bossId === sat0.id));
    expect(carrying).toHaveLength(1);
    expect(carrying[0].day).toBe("sat");
    expect(carrying[0].startHour).toBe(0);
  });

  it("keeps Mewtwo X energy raids on Saturday and Y on Sunday", () => {
    const { inputs, results } = buildFor([MEWTWO_X_ID, MEWTWO_Y_ID]);
    const plan = computeBlockPlan(inputs, results, ROOMY, DEFAULT_SETTINGS, []);
    for (const block of plan.blocks) {
      for (const s of block.species) {
        if (s.bossId === MEWTWO_X_ID) expect(block.day).toBe("sat");
        if (s.bossId === MEWTWO_Y_ID) expect(block.day).toBe("sun");
      }
    }
    // And both forms actually got placed.
    expect(plan.blocks.some((b) => b.species.some((s) => s.bossId === MEWTWO_X_ID))).toBe(true);
    expect(plan.blocks.some((b) => b.species.some((s) => s.bossId === MEWTWO_Y_ID))).toBe(true);
  });

  it("water-fills Mewtwo into the lighter blocks, never widening the spread", () => {
    const blockA = SINGLE_BLOCK.find((b) => b.windows[0].day === "sat" && b.windows[0].startHour === 0)!;
    const blockB = SINGLE_BLOCK.find((b) => b.windows[0].day === "sat" && b.windows[0].startHour === 3)!;
    const spread = (ids: string[]) => {
      const { inputs, results } = buildFor(ids);
      const sat = computeBlockPlan(inputs, results, ROOMY, DEFAULT_SETTINGS, []).blocks.filter((b) => b.day === "sat");
      return { sat, range: Math.max(...sat.map((b) => b.demand)) - Math.min(...sat.map((b) => b.demand)) };
    };
    const before = spread([blockA.id, blockB.id]).range;
    const after = spread([blockA.id, blockB.id, MEWTWO_X_ID]);
    // Mewtwo only ever raises the current-lowest block, so the spread can't grow.
    expect(after.range).toBeLessThanOrEqual(Math.max(before, 1));
    // The previously-empty Saturday block (hours 6–9) gets back-filled by Mewtwo.
    const empty = after.sat.find((b) => b.startHour === 6)!;
    expect(empty.species.some((s) => s.mewtwo && s.bossId === MEWTWO_X_ID)).toBe(true);
  });

  it("reports a shortfall (never grey, bar capped at 100%) when over capacity", () => {
    // A single fixed boss asked to max 200 copies overruns its one 3-hour block.
    const boss = SINGLE_BLOCK.find((b) => b.windows[0].day === "sat")!;
    const inputs = [{ ...makeDefaultInput(boss), quantity: 200 }];
    const results = inputs.map((i) => computeBossResult(boss, i));
    const plan = computeBlockPlan(inputs, results, ROOMY, DEFAULT_SETTINGS, []);
    const over = plan.blocks.find((b) => b.remaining > 0)!;
    expect(over).toBeTruthy();
    expect(plan.feasible).toBe(false);
    // The bar fill never exceeds capacity, and fitted + remaining accounts for all demand.
    expect(over.fitted).toBeLessThanOrEqual(over.capacity.max);
    expect(over.fitted + over.remaining).toBe(over.demand);
  });

  it("per-block band counts sum to what fit (not the full demand)", () => {
    const { inputs, results } = buildFor([MEWTWO_X_ID, MEWTWO_Y_ID]);
    const plan = computeBlockPlan(inputs, results, ROOMY, DEFAULT_SETTINGS, []);
    for (const b of plan.blocks) {
      expect(sum(b.bands)).toBe(b.fitted);
      expect(b.fitted + b.remaining).toBe(b.demand);
    }
  });

  it("respects explicit priority order (lowest priority takes the risky tail)", () => {
    // Two bosses sharing one Saturday block; whichever is ranked last eats red/grey.
    const sat0 = SORTED_BOSSES.filter(
      (b) => b.windows.length === 1 && b.windows[0].day === "sat" && b.windows[0].startHour === 0,
    ).slice(0, 2);
    if (sat0.length < 2) return;
    const [a, b] = sat0;
    const { inputs, results } = buildFor([a.id, b.id]);
    const plan = computeBlockPlan(inputs, results, ROOMY, DEFAULT_SETTINGS, [b.id, a.id]);
    const block = plan.blocks.find((x) => x.species.length >= 2)!;
    // b is highest priority → appears first in the block's ordered species.
    expect(block.species[0].bossId).toBe(b.id);
  });
});

describe("remote raids (manual per-species allocation)", () => {
  const REMOTE_ON = { ...DEFAULT_SETTINGS, useRemoteRaids: true };
  const remoteOnly = SORTED_BOSSES.find((b) => !isMewtwo(b.id) && !bossIsLocal(b, DEFAULT_SETTINGS.region));
  // A 5★ (big XL climb) keeps the in-person demand comfortably above the 5 we shift remote.
  const localSat = SINGLE_BLOCK.find(
    (b) => b.windows[0].day === "sat" && b.tier === "five-star" && bossIsLocal(b, DEFAULT_SETTINGS.region),
  )!;

  it("keeps region-locked targets out of the blocks; allocated ones land in the remote pool", () => {
    if (!remoteOnly) return;
    const { inputs, results } = buildFor([remoteOnly.id]);
    const plan = computeBlockPlan(inputs, results, ROOMY, REMOTE_ON, [], { [remoteOnly.id]: 5 });
    expect(plan.blocks.some((b) => b.species.some((s) => s.bossId === remoteOnly.id))).toBe(false);
    expect(plan.remote?.species.find((s) => s.bossId === remoteOnly.id)?.raids).toBe(5);
  });

  it("omits the remote pool until the user opts in", () => {
    const { inputs, results } = buildFor([MEWTWO_X_ID]);
    expect(computeBlockPlan(inputs, results, ROOMY, DEFAULT_SETTINGS, [], { [MEWTWO_X_ID]: 5 }).remote).toBeUndefined();
  });

  it("a remote allocation reduces that species' in-person block demand", () => {
    const { inputs, results } = buildFor([localSat.id]);
    const blockDemand = (plan: ReturnType<typeof computeBlockPlan>) =>
      plan.blocks.reduce((s, b) => s + b.species.filter((x) => x.bossId === localSat.id).reduce((a, x) => a + x.raids, 0), 0);
    const before = blockDemand(computeBlockPlan(inputs, results, ROOMY, DEFAULT_SETTINGS, []));
    const after = blockDemand(computeBlockPlan(inputs, results, ROOMY, REMOTE_ON, [], { [localSat.id]: 5 }));
    expect(before).toBeGreaterThan(5);
    expect(after).toBe(before - 5);
  });

  it("the remote bar's capacity is the 60-pass budget and reflects the allocations", () => {
    const { inputs, results } = buildFor([MEWTWO_X_ID]);
    const plan = computeBlockPlan(inputs, results, ROOMY, REMOTE_ON, [], { [MEWTWO_X_ID]: 10 });
    expect(plan.remote!.capacity).toBe(MAX_REMOTE_RAIDS);
    expect(plan.remote!.fitted).toBe(10);
  });
});

describe("rareCandyForecast", () => {
  it("gives 1 Rare Candy per raid and 1 Rare Candy XL per non-Mega raid", () => {
    const { inputs, results } = buildFor([MEWTWO_X_ID, MEWTWO_Y_ID]);
    const plan = computeBlockPlan(inputs, results, ROOMY, DEFAULT_SETTINGS, []);
    const totalRaids = plan.blocks.reduce((s, b) => s + b.fitted, 0);
    const f = rareCandyForecast(plan);
    expect(f.rareCandy).toBe(totalRaids);
    // Mewtwo is super-mega (not "mega"), so every raid also yields Rare Candy XL.
    expect(f.rareCandyXl).toBe(totalRaids);
  });

  it("excludes regular Mega raids from Rare Candy XL", () => {
    const mega = SORTED_BOSSES.find((b) => b.tier === "mega" && !isMewtwo(b.id) && bossIsLocal(b, DEFAULT_SETTINGS.region));
    if (!mega) return;
    const { inputs, results } = buildFor([mega.id]);
    const plan = computeBlockPlan(inputs, results, ROOMY, DEFAULT_SETTINGS, []);
    const f = rareCandyForecast(plan);
    expect(f.rareCandy).toBeGreaterThan(0);
    expect(f.rareCandyXl).toBe(0); // a Mega raid gives Rare Candy but no Rare Candy XL
  });
});

it("HABITATS has the six blocks the plan iterates", () => {
  expect(HABITATS).toHaveLength(6);
  expect(HABITATS.filter((h) => h.day === "sat")).toHaveLength(3);
  expect(HABITATS.filter((h) => h.day === "sun")).toHaveLength(3);
});
