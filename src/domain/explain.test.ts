import { describe, expect, it } from "vitest";
import { computeBossResult } from "./raidsNeeded";
import { explainCurrency } from "./explain";
import { getBoss } from "@/data";
import type { BossInput, Currency } from "./types";

const input = (bossId: string, over: Partial<BossInput> = {}): BossInput => ({
  bossId,
  selected: true,
  counts: { standard: 1, shadow: 0, purified: 0 },
  current: { candy: 0, xlCandy: 0, megaEnergy: 0, level: 40, megaLevel: 0 },
  target: { level: 50, megaLevel: 4 },
  ...over,
});

/** The explanation's final numbers must equal what the engine computed. */
function expectMatch(bossId: string, currency: Currency, inp: BossInput, megaBuddyLevel = 1) {
  const boss = getBoss(bossId)!;
  const result = computeBossResult(boss, inp, {}, megaBuddyLevel);
  const need = result.needs[currency];
  const ex = explainCurrency(boss, inp, currency, {}, megaBuddyLevel);
  expect(ex).not.toBeNull();
  expect(ex!.needed).toBe(need!.needed);
  expect(ex!.raids).toEqual(need!.raidsRange);
}

describe("explainCurrency matches the engine", () => {
  it("XL leveling for a 5★ legendary (with and without the buddy boost)", () => {
    expectMatch("zekrom", "xlCandy", input("zekrom"), 1);
    expectMatch("zekrom", "xlCandy", input("zekrom"), 3); // +25% reward → fewer raids
    expectMatch("zekrom", "xlCandy", input("zekrom", { l4Buddy: true }), 3); // +30%
  });

  it("XL with on-hand candy and multiple copies", () => {
    expectMatch("zekrom", "xlCandy", input("zekrom", { current: { ...input("zekrom").current, xlCandy: 120 }, quantity: 2 }), 3);
  });

  it("Mega Energy for Mewtwo across mega levels", () => {
    expectMatch("mega-mewtwo-x", "megaEnergy", input("mega-mewtwo-x", { target: { level: 40, megaLevel: 3 } }));
  });

  it("a calibrated XL value is shown as-is and still matches", () => {
    const boss = getBoss("zekrom")!;
    const inp = input("zekrom");
    const result = computeBossResult(boss, inp, { legendaryXl: 8 }, 3);
    const ex = explainCurrency(boss, inp, "xlCandy", { legendaryXl: 8 }, 3);
    expect(ex!.raids).toEqual(result.needs.xlCandy!.raidsRange);
  });

  it("returns null when nothing is needed", () => {
    const boss = getBoss("zekrom")!;
    // already at target level with XL in hand → no XL need
    const inp = input("zekrom", { current: { ...input("zekrom").current, level: 50, xlCandy: 9999 } });
    expect(explainCurrency(boss, inp, "xlCandy")).toBeNull();
  });

  it("exposes editable source fields in the token stream", () => {
    const boss = getBoss("zekrom")!;
    const ex = explainCurrency(boss, input("zekrom"), "xlCandy", {}, 3)!;
    const fields = ex.lines.flatMap((l) => l.tokens).filter((t) => t.t === "edit").map((t) => (t as { field: string }).field);
    expect(fields).toContain("current.level");
    expect(fields).toContain("target.level");
    expect(fields).toContain("current.xlCandy");
  });
});
