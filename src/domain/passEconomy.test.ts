import { describe, expect, it } from "vitest";
import { computePassCost, linkChargeCost } from "./passEconomy";
import { DEFAULT_SETTINGS } from "./settings";
import type { BossInput, BossResult } from "./types";

const input = (bossId: string): BossInput => ({
  bossId,
  selected: true,
  counts: { standard: 1, shadow: 0, purified: 0 },
  current: { candy: 0, xlCandy: 0, megaEnergy: 0, level: 1, megaLevel: 0 },
  target: { level: 1, megaLevel: 0 },
});

const result = (bossId: string, raids: number): BossResult => ({
  bossId,
  needs: { candy: { needed: raids, raidsRange: { min: raids, max: raids } } },
  raids: { min: raids, max: raids },
  bindingCurrency: "candy",
});

describe("linkChargeCost", () => {
  it("buys 800 Link Charges for 350 coins via 600+200", () => {
    const { coins, counts } = linkChargeCost(800);
    expect(coins).toBe(350);
    expect(counts).toEqual([
      { lc: 600, coins: 250, n: 1 },
      { lc: 200, coins: 100, n: 1 },
    ]);
  });
  it("is free for zero charges", () => {
    expect(linkChargeCost(0)).toEqual({ coins: 0, counts: [] });
  });
  it("minimises coins for 1600 charges (2× Super Mega) → 700", () => {
    expect(linkChargeCost(1600).coins).toBe(700);
  });
});

describe("computePassCost", () => {
  it("is free when the free daily passes cover every in-person raid", () => {
    // 10 in-person raids ≤ 18 free weekend passes → 0 coins.
    const cost = computePassCost([input("zekrom")], [result("zekrom", 10)], DEFAULT_SETTINGS);
    expect(cost.paidInPerson).toBe(0);
    expect(cost.hasCost).toBe(false);
    expect(cost.high.total).toBe(0);
  });

  it("charges green passes for in-person raids beyond the free allotment", () => {
    // 30 in-person − 18 free = 12 paid → 4× 3-pack (1000) high; box (600) low.
    const cost = computePassCost([input("zekrom")], [result("zekrom", 30)], DEFAULT_SETTINGS);
    expect(cost.paidInPerson).toBe(12);
    expect(cost.high.greenCoins).toBe(1000);
    expect(cost.low.greenCoins).toBe(600);
    expect(cost.totalRemote).toBe(0);
  });

  it("adds free passes for each Road of Legends weekday played (lowering cost)", () => {
    // 30 in-person, 2 weekdays played → 18 + 2×3 = 24 free → 6 paid.
    const cost = computePassCost([input("zekrom")], [result("zekrom", 30)], DEFAULT_SETTINGS, {}, { mon: true, tue: true });
    expect(cost.freePasses).toBe(24);
    expect(cost.paidInPerson).toBe(6);
  });

  it("requires a remote pass AND 200 Link Charges per remote Super Mega raid", () => {
    const settings = { ...DEFAULT_SETTINGS, useRemoteRaids: true };
    const cost = computePassCost(
      [input("mega-mewtwo-x")],
      [result("mega-mewtwo-x", 10)],
      settings,
      { "mega-mewtwo-x": 2 },
    );
    expect(cost.remoteSuperMegaRaids).toBe(2);
    expect(cost.superMegaInPersonRaids).toBe(8); // covered by free passes
    expect(cost.linkChargesNeeded).toBe(400); // 2 × 200 LC
    expect(cost.high.linkChargeCoins).toBe(200); // 2× 200-LC pack (100 ea)
    expect(cost.high.remoteCoins).toBe(525); // ceil(2/3) × 525
    expect(cost.paidInPerson).toBe(0);
  });

  it("owned Link Charges cover the mandatory remote Super-Mega LC", () => {
    const settings = { ...DEFAULT_SETTINGS, useRemoteRaids: true, linkChargesOwned: 400 };
    const cost = computePassCost([input("mega-mewtwo-x")], [result("mega-mewtwo-x", 10)], settings, { "mega-mewtwo-x": 2 });
    expect(cost.linkChargesNeeded).toBe(0); // 400 owned == 2×200 needed
    expect(cost.high.linkChargeCoins).toBe(0);
  });

  it("opting in spends owned Link Charges on paid in-person Mega raids, freeing green passes", () => {
    // 30 in-person Mega raids − 18 free = 12 paid. 900 owned LC ÷ 150 = 6 raids
    // covered by LC → 6 paid green passes left.
    const settings = { ...DEFAULT_SETTINGS, useLinkCharges: true, linkChargesOwned: 900 };
    const cost = computePassCost([input("mega-blaziken")], [result("mega-blaziken", 30)], settings);
    expect(cost.passesSavedByLinkCharges).toBe(6);
    expect(cost.paidInPerson).toBe(6);
  });

  it("treats a region-locked target as remote even without a remote allocation", () => {
    // Xurkitree is APAC-locked; the default region isn't APAC.
    const cost = computePassCost([input("xurkitree")], [result("xurkitree", 4)], DEFAULT_SETTINGS);
    expect(cost.totalRemote).toBe(4);
    expect(cost.inPersonRaids).toBe(0);
  });
});
