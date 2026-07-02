import { describe, expect, it } from "vitest";
import { computeCapacity, tierBattleSeconds } from "./capacity";
import { GAME_CONFIG } from "@/data/config";
import { DEFAULT_SETTINGS } from "./settings";

// Every raid count in the app flows through computeCapacity, so its invariants
// are pinned directly (it was previously only exercised incidentally).

const cfg = GAME_CONFIG.capacity;

describe("tierBattleSeconds", () => {
  it("clamps the lobby to the tier's minimum viable size (never faster than minSec at the floor)", () => {
    // superMega needs ≥10 raiders — a lobby of 2 behaves like a lobby of 10.
    const tiny = tierBattleSeconds("superMega", { ...DEFAULT_SETTINGS, lobbySize: 2, partyPlay: false });
    const atMin = tierBattleSeconds("superMega", { ...DEFAULT_SETTINGS, lobbySize: 10, partyPlay: false });
    expect(tiny).toBe(atMin);
    expect(tiny).toBe(cfg.battle.superMega.minSec);
  });

  it("is monotonic: a fuller lobby is never slower", () => {
    for (const tier of ["superMega", "mega", "fiveStar"] as const) {
      let prev = Infinity;
      for (let lobby = 2; lobby <= 20; lobby++) {
        const sec = tierBattleSeconds(tier, { ...DEFAULT_SETTINGS, lobbySize: lobby, partyPlay: false });
        expect(sec).toBeLessThanOrEqual(prev);
        prev = sec;
      }
    }
  });

  it("Party Play shaves seconds but never below the tier floor", () => {
    const base = tierBattleSeconds("mega", { ...DEFAULT_SETTINGS, lobbySize: 20, partyPlay: false });
    const party = tierBattleSeconds("mega", { ...DEFAULT_SETTINGS, lobbySize: 20, partyPlay: true, partySize: 4 });
    expect(party).toBeLessThanOrEqual(base);
    expect(party).toBeGreaterThanOrEqual(cfg.battle.mega.floorSec);
  });
});

describe("computeCapacity", () => {
  it("produces a coherent range: min ≤ max for raids/hour and totals", () => {
    const cap = computeCapacity(DEFAULT_SETTINGS);
    expect(cap.raidsPerHour.min).toBeLessThanOrEqual(cap.raidsPerHour.max);
    expect(cap.raidsPerHour.min).toBeGreaterThan(0);
    expect(cap.totalRaids.min).toBe(cap.raidsPerHour.min * cap.hoursPerDay * cap.days);
    expect(cap.totalRaids.max).toBe(cap.raidsPerHour.max * cap.hoursPerDay * cap.days);
  });

  it("more downtime → fewer raids per hour", () => {
    const fast = computeCapacity({ ...DEFAULT_SETTINGS, downtimeSecRange: { min: 10, max: 20 } });
    const slow = computeCapacity({ ...DEFAULT_SETTINGS, downtimeSecRange: { min: 120, max: 240 } });
    expect(slow.raidsPerHour.max).toBeLessThanOrEqual(fast.raidsPerHour.max);
    expect(slow.raidsPerHour.min).toBeLessThanOrEqual(fast.raidsPerHour.min);
  });

  it("quickCatchSlotFactor is in (0, 1]: quick-catch never costs more than a normal raid", () => {
    const cap = computeCapacity(DEFAULT_SETTINGS);
    expect(cap.quickCatchSlotFactor).toBeGreaterThan(0);
    expect(cap.quickCatchSlotFactor).toBeLessThanOrEqual(1);
  });

  it("remote capacity is exactly the planned remote passes, clamped to a whole non-negative count", () => {
    expect(computeCapacity({ ...DEFAULT_SETTINGS, remoteRaidPassesPlanned: 12 }).remoteCapacity).toEqual({
      min: 12,
      max: 12,
    });
    expect(computeCapacity({ ...DEFAULT_SETTINGS, remoteRaidPassesPlanned: -3 }).remoteCapacity).toEqual({
      min: 0,
      max: 0,
    });
    expect(computeCapacity({ ...DEFAULT_SETTINGS, remoteRaidPassesPlanned: 7.6 }).remoteCapacity).toEqual({
      min: 8,
      max: 8,
    });
  });
});
