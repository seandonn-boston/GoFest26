import { describe, expect, it } from "vitest";
import { GO_PASS_DELUXE_CREDITS, goPassCreditsAboveRank } from "./goPass";
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

  it("filters credits by the claimed rank (only ranks above still count)", () => {
    // Level 0 (default) = the whole track.
    expect(goPassCreditsAboveRank(0)).toHaveLength(GO_PASS_DELUXE_CREDITS.length);
    // At rank 13, Articuno (12) and Zapdos (13) are claimed; Moltres (14) isn't.
    const at13 = goPassCreditsAboveRank(13);
    expect(at13.some((c) => c.bossId === "articuno")).toBe(false);
    expect(at13.some((c) => c.bossId === "zapdos")).toBe(false);
    expect(at13.some((c) => c.bossId === "moltres")).toBe(true);
    // Mewtwo's rewards land one rank at a time (Candy 90–93, XL 91–93): at rank
    // 91 there are 20 Candy + 20 XL still incoming per mirrored form.
    const at91 = goPassCreditsAboveRank(91).filter((c) => c.bossId === "mega-mewtwo-x");
    expect(at91.filter((c) => c.currency === "candy").reduce((s, c) => s + c.amount, 0)).toBe(20);
    expect(at91.filter((c) => c.currency === "xlCandy").reduce((s, c) => s + c.amount, 0)).toBe(20);
    // Rank 100 = everything claimed, nothing left to credit.
    expect(goPassCreditsAboveRank(100)).toHaveLength(0);
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

  it("region-locked bosses use the REMOTE legendary-XL profile (field-verified)", () => {
    // Field data (Jul 2026): 20 remote Xurkitree raids paid 100 XL — 5.0/catch —
    // with an L3 same-type buddy AND GO Pass Deluxe. The in-person profile
    // (5–6 base) modeled that setup at 7–8/catch, overestimating remote XL ~40%.
    // Remote base is 3–4, so buddy (+1) + pass (+1) → 5–6, matching the field.
    const xurkitree = getBoss("xurkitree")!; // region-locked from the default region
    const input = makeDefaultInput(xurkitree);
    const summary = computePlanSummary([input], passOn);
    const xl = summary.results[0].needs.xlCandy!;
    // 296 XL to L50 − 10 rank-track credit = 286 needed at 5–6/catch → 48–58 raids.
    expect(xl.raidsRange).toEqual({ min: Math.ceil(286 / 6), max: Math.ceil(286 / 5) });

    // A LOCAL five-star keeps the in-person profile: 7–8/catch with the pass.
    const zekrom = getBoss("zekrom")!;
    const zSummary = computePlanSummary([makeDefaultInput(zekrom)], passOn);
    const zXl = zSummary.results[0].needs.xlCandy!;
    expect(zXl.raidsRange).toEqual({ min: Math.ceil(zXl.needed / 8), max: Math.ceil(zXl.needed / 7) });
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

  it("a claimed GO Pass rank stops crediting the ranks already passed", () => {
    // Zapdos unlocks at rank 13. A player already at rank 13 has claimed it —
    // it's in their typed-in counts — so no credit; at rank 12 it still counts.
    const input = makeDefaultInput(getBoss("zapdos")!);
    const base = computePlanSummary([input], DEFAULT_SETTINGS).results[0].needs.xlCandy!.needed;
    const at13 = computePlanSummary([input], { ...passOn, goPassLevel: 13 }).results[0].needs.xlCandy!.needed;
    const at12 = computePlanSummary([input], { ...passOn, goPassLevel: 12 }).results[0].needs.xlCandy!.needed;
    expect(at13).toBe(base);
    expect(at12).toBe(base - 10);
  });
});
