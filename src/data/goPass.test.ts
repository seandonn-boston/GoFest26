import { describe, expect, it } from "vitest";
import { GO_PASS_DELUXE_CREDITS } from "./goPass";
import { getBoss } from "@/data";
import { makeDefaultInput } from "@/domain/defaults";
import { computePlanSummary, computeBossResult } from "@/domain";
import { DEFAULT_SETTINGS } from "@/domain/settings";

describe("GO Pass Deluxe credits", () => {
  it("every credit resolves to a real roster boss", () => {
    for (const c of GO_PASS_DELUXE_CREDITS) {
      expect(getBoss(c.bossId), `unknown boss id in GO Pass credits: ${c.bossId}`).toBeTruthy();
    }
  });

  it("carries the track's marquee amounts (Mewtwo 40/30, Gardevoir 300 energy)", () => {
    const mewtwoXl = GO_PASS_DELUXE_CREDITS.filter((c) => c.bossId === "mega-mewtwo-x" && c.currency === "xlCandy");
    expect(mewtwoXl.reduce((s, c) => s + c.amount, 0)).toBe(30);
    const mewtwoCandy = GO_PASS_DELUXE_CREDITS.filter((c) => c.bossId === "mega-mewtwo-x" && c.currency === "candy");
    expect(mewtwoCandy.reduce((s, c) => s + c.amount, 0)).toBe(40);
    const gardevoir = GO_PASS_DELUXE_CREDITS.find((c) => c.bossId === "mega-gardevoir" && c.currency === "megaEnergy");
    expect(gardevoir?.amount).toBe(300);
    // A representative track legendary: +10 candy (Basic) and +10 XL (Deluxe).
    const zapdos = GO_PASS_DELUXE_CREDITS.filter((c) => c.bossId === "zapdos");
    expect(zapdos.find((c) => c.currency === "candy")?.amount).toBe(10);
    expect(zapdos.find((c) => c.currency === "xlCandy")?.amount).toBe(10);
  });
});

describe("GO Pass Deluxe in the plan math", () => {
  const passOn = { ...DEFAULT_SETTINGS, goPassDeluxe: true };

  it("adds +1 XL and +3 candy per catch for a five-star boss (fewer raids needed)", () => {
    const boss = getBoss("zekrom")!;
    const input = makeDefaultInput(boss);
    const off = computeBossResult(boss, input, {}, 3, false);
    const on = computeBossResult(boss, input, {}, 3, true);
    // Regression numbers: default L50 goal, mega buddy L3. XL per raid goes
    // 6–7 (5–6 base + 1 buddy) → 7–8 with the pass, so worst-case raids drop.
    expect(on.needs.xlCandy!.raidsRange.max).toBeLessThan(off.needs.xlCandy!.raidsRange.max);
    expect(on.needs.candy ? on.needs.candy.raidsRange.max <= off.needs.candy!.raidsRange.max : true).toBe(true);
  });

  it("does NOT bump plain Mega Raid catches (below Tier 5)", () => {
    const boss = getBoss("mega-salamence")!;
    const input = makeDefaultInput(boss);
    const off = computeBossResult(boss, input, {}, 3, false);
    const on = computeBossResult(boss, input, {}, 3, true);
    expect(on.needs.xlCandy?.raidsRange).toEqual(off.needs.xlCandy?.raidsRange);
  });

  it("computePlanSummary folds the rank-track credits only when the pass is on", () => {
    const boss = getBoss("zapdos")!;
    const input = makeDefaultInput(boss);
    const off = computePlanSummary([input], DEFAULT_SETTINGS);
    const on = computePlanSummary([input], passOn);
    const offNeed = off.results[0].needs.xlCandy!.needed;
    const onNeed = on.results[0].needs.xlCandy!.needed;
    // +10 XL credited on-hand → the XL still needed drops by exactly 10.
    expect(onNeed).toBe(offNeed - 10);
  });
});
