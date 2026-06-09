import { describe, expect, it } from "vitest";
import { getBoss } from "@/data";
import { GAME_CONFIG } from "@/data/config";
import { makeDefaultInput } from "./defaults";
import { computeBossResult } from "./raidsNeeded";
import { computeCapacity } from "./capacity";
import { computeNetNeed } from "./requirements";
import { applyResearchCredits } from "./research";
import { computeSchedule } from "./scheduler";
import { DEFAULT_SETTINGS, type PlannerSettings } from "./settings";
import { computePlanSummary } from "./index";
import type { BossInput } from "./types";

function planningPerHour() {
  const cap = computeCapacity();
  return Math.max(1, Math.round((cap.raidsPerHour.min + cap.raidsPerHour.max) / 2));
}

function scheduleFor(inputs: BossInput[], settings: PlannerSettings = DEFAULT_SETTINGS) {
  const cap = computeCapacity(settings);
  const results = inputs
    .filter((i) => i.selected)
    .map((i) => computeBossResult(getBoss(i.bossId)!, i));
  return computeSchedule(inputs, results, cap, settings);
}

const mewtwoX = getBoss("mega-mewtwo-x")!;
const reshiram = getBoss("reshiram")!;

function input(bossId: string, overrides: Partial<BossInput["current"]> & { targetMegaLevel?: number; targetLevel?: number } = {}): BossInput {
  const base = makeDefaultInput(getBoss(bossId)!);
  return {
    ...base,
    current: { ...base.current, ...overrides },
    target: {
      level: overrides.targetLevel ?? base.target.level,
      megaLevel: overrides.targetMegaLevel ?? base.target.megaLevel,
    },
  };
}

describe("requirements", () => {
  it("clamps net need at zero when you already have enough", () => {
    const net = computeNetNeed(reshiram, input("reshiram", { xlCandy: 9999, level: 40, targetLevel: 50 }));
    expect(net.xlCandy).toBe(0);
  });

  it("computes full XL need for a standard 40->50 climb", () => {
    const net = computeNetNeed(reshiram, input("reshiram", { level: 40, targetLevel: 50 }));
    expect(net.xlCandy).toBe(GAME_CONFIG.xlToLevel50.standard); // 296
  });

  it("scales XL linearly for a partial 45->50 climb", () => {
    const net = computeNetNeed(reshiram, input("reshiram", { level: 45, targetLevel: 50 }));
    expect(net.xlCandy).toBe(Math.round(GAME_CONFIG.xlToLevel50.standard / 2)); // 148
  });

  it("needs Mega Energy to climb Mega Levels with none on hand (independent of leveling)", () => {
    // Mega Level 1 -> 4 with 0 energy held should require the climb, NOT report 0.
    const net = computeNetNeed(mewtwoX, input("mega-mewtwo-x", { megaLevel: 1, targetMegaLevel: 4, megaEnergy: 0 }));
    const totals = mewtwoX.megaLevelEnergyTotals!;
    expect(net.megaEnergy).toBe(totals[4] - totals[1]); // 18580 - 7500 = 11080
  });

  it("includes the 7,500 first-evolution cost at Mega Level 0 (no forced floor)", () => {
    // A Mewtwo you already own at Mega Level 0 owes the full climb incl. 7,500.
    const net = computeNetNeed(mewtwoX, input("mega-mewtwo-x", { megaLevel: 0, targetMegaLevel: 4 }));
    const totals = mewtwoX.megaLevelEnergyTotals!;
    expect(net.megaEnergy).toBe(totals[4] - totals[0]); // 18580 - 0 = 18580
  });
});

describe("research credits", () => {
  it("credits research rewards as on-hand currency, reducing raids", () => {
    const base = input("reshiram", { level: 40, targetLevel: 50 }); // needs 296 XL
    const [credited] = applyResearchCredits([base], [
      { bossId: "reshiram", currency: "xlCandy", amount: 100 },
    ]);
    expect(credited.current.xlCandy).toBe(100);
    const before = computeBossResult(reshiram, base);
    const after = computeBossResult(reshiram, credited);
    expect(after.raids.max).toBeLessThan(before.raids.max);
  });

  it("only credits the targeted boss and never mutates the input", () => {
    const base = input("reshiram", { level: 40, targetLevel: 50 });
    const out = applyResearchCredits([base], [
      { bossId: "mega-mewtwo-x", currency: "megaEnergy", amount: 100 },
    ]);
    expect(out[0].current.megaEnergy).toBe(base.current.megaEnergy); // untouched
    expect(base.current.xlCandy).toBe(0); // original not mutated
  });
});

describe("raidsNeeded", () => {
  it("the mega-buddy candy bonus reduces candy-driven raids", () => {
    // Level 10→40 needs regular Candy (no XL band) → Candy is the constraint.
    const base = input("reshiram", { level: 10, targetLevel: 40 });
    const withBuddy = computeBossResult(reshiram, { ...base, megaBuddy: true });
    const noBuddy = computeBossResult(reshiram, { ...base, megaBuddy: false });
    expect(withBuddy.bindingCurrency).toBe("candy");
    expect(withBuddy.raids.max).toBeLessThan(noBuddy.raids.max);
  });

  it("skipping the catch removes catch-based candy/XL needs", () => {
    const base = input("reshiram", { level: 40, targetLevel: 50 });
    expect(computeBossResult(reshiram, base).bindingCurrency).toBe("xlCandy");
    const skip = computeBossResult(reshiram, { ...base, skipCatch: true });
    expect(skip.bindingCurrency).toBeNull();
    expect(skip.raids).toEqual({ min: 0, max: 0 });
  });

  it("uses Super Mega energy rewards to size Mewtwo raids", () => {
    // Isolate the mega-energy goal (no leveling) so Mega Energy is the constraint.
    const result = computeBossResult(
      mewtwoX,
      input("mega-mewtwo-x", { megaLevel: 1, targetMegaLevel: 4, level: 40, targetLevel: 40 }),
    );
    const need = 18580 - 7500; // 11080 (Mega Level 1 -> 4)
    const { min, max } = GAME_CONFIG.megaRewards.superMega;
    expect(result.bindingCurrency).toBe("megaEnergy");
    expect(result.raids.min).toBe(Math.ceil(need / max));
    expect(result.raids.max).toBe(Math.ceil(need / min));
  });

  it("returns zero raids when nothing is needed", () => {
    const result = computeBossResult(reshiram, input("reshiram", { xlCandy: 9999, level: 40, targetLevel: 50 }));
    expect(result.raids).toEqual({ min: 0, max: 0 });
    expect(result.bindingCurrency).toBeNull();
  });
});

describe("capacity", () => {
  it("derives raids/hour and weekend totals from the timing model", () => {
    const cap = computeCapacity();
    // Default plan: full 20-trainer lobby, normal catch.
    expect(cap.lobbySize).toBe(GAME_CONFIG.capacity.defaultLobbySize);
    expect(cap.catchSec).toBe(GAME_CONFIG.capacity.catchSec.normal);
    const perRaidFast = cap.battleSecRange.min + cap.catchSec + cap.downtimeSecRange.min;
    expect(cap.raidsPerHour.max).toBe(Math.floor(3600 / perRaidFast));
    expect(cap.totalRaids.max).toBe(cap.raidsPerHour.max * cap.hoursPerDay * cap.days);
  });

  it("quick catch shrinks per-raid time, so more raids fit", () => {
    const normal = computeCapacity({ ...DEFAULT_SETTINGS, quickCatch: false });
    const quick = computeCapacity({ ...DEFAULT_SETTINGS, quickCatch: true });
    expect(quick.catchSec).toBe(GAME_CONFIG.capacity.catchSec.quick);
    expect(quick.raidsPerHour.max).toBeGreaterThan(normal.raidsPerHour.max);
  });

  it("thinner lobbies mean longer battles and fewer raids", () => {
    const full = computeCapacity({ ...DEFAULT_SETTINGS, lobbySize: 20 });
    const thin = computeCapacity({ ...DEFAULT_SETTINGS, lobbySize: 4 });
    expect(thin.battleSecRange.max).toBeGreaterThan(full.battleSecRange.max);
    expect(thin.raidsPerHour.max).toBeLessThan(full.raidsPerHour.max);
  });

  it("party play shaves battle time", () => {
    const noParty = computeCapacity({ ...DEFAULT_SETTINGS, partyPlay: false });
    const party = computeCapacity({ ...DEFAULT_SETTINGS, partyPlay: true, partySize: 4 });
    // A full-lobby Mega is 30s; a party of 4 shaves 15s -> 15s (the floor).
    expect(party.battleSecRange.min).toBe(15);
    expect(party.battleSecRange.min).toBeLessThan(noParty.battleSecRange.min);
  });
});

describe("scheduler", () => {
  it("places exactly the demanded number of Mewtwo raids (no overshoot)", () => {
    const mewtwo = input("mega-mewtwo-x", { megaLevel: 1, targetMegaLevel: 4, level: 40, targetLevel: 40 });
    const result = computeBossResult(mewtwoX, mewtwo);
    const expectedDemand = Math.ceil((result.raids.min + result.raids.max) / 2);

    const schedule = scheduleFor([mewtwo]);
    const placed = schedule.raids.filter((r) => r.bossId === "mega-mewtwo-x").length;
    expect(placed).toBe(expectedDemand);
    expect(schedule.feasible).toBe(true);
  });

  it("only places a windowed boss inside its habitat windows", () => {
    // Reshiram is only available Saturday's Dragonflight Summit (hours 6–9).
    const resh = input("reshiram", { level: 40, targetLevel: 50 });
    const schedule = scheduleFor([resh]);
    const reshRaids = schedule.raids.filter((r) => r.bossId === "reshiram");
    expect(reshRaids.length).toBeGreaterThan(0);
    for (const r of reshRaids) {
      expect(r.day).toBe("sat");
      expect(r.hour).toBeGreaterThanOrEqual(6);
      expect(r.hour).toBeLessThan(9);
    }
  });

  it("marks out-of-region bosses as remote and keeps in-region ones local (Boston default)", () => {
    // Boston = Northern/Western/Americas. Celesteela is Southern-only → remote;
    // Kartana is Northern → local. Small goals so both fit the shared window.
    const celesteela = input("celesteela", { xlCandy: 290, level: 40, targetLevel: 50 });
    const kartana = input("kartana", { xlCandy: 290, level: 40, targetLevel: 50 });
    const schedule = scheduleFor([celesteela, kartana]);

    const cel = schedule.raids.find((r) => r.bossId === "celesteela");
    const kar = schedule.raids.find((r) => r.bossId === "kartana");
    expect(cel?.remote).toBe(true);
    expect(cel?.passType).toBe("remote");
    expect(kar?.remote).toBe(false);
    expect(kar?.passType).not.toBe("remote");
  });

  it("caps remote-only bosses at the remote-raid budget (and Friday adds more)", () => {
    // Celesteela is Southern-only → remote for Boston; a level 40→50 goal needs
    // far more than the per-day remote cap.
    const cel = input("celesteela", { level: 40, targetLevel: 50 });
    const base = scheduleFor([cel]);
    expect(base.raids.filter((r) => r.bossId === "celesteela").length).toBe(20);

    const withFriday = scheduleFor([cel], { ...DEFAULT_SETTINGS, fridayRemoteRaids: true });
    expect(withFriday.raids.filter((r) => r.bossId === "celesteela").length).toBe(40);
  });

  it("flags an unmet goal when a windowed boss needs more raids than its windows allow", () => {
    const resh = input("reshiram", { level: 40, targetLevel: 50 }); // needs ~111 raids
    const schedule = scheduleFor([resh]);
    const windowSlots = 3 * planningPerHour(); // 3 available hours
    const placed = schedule.raids.length;
    expect(placed).toBe(windowSlots);
    expect(schedule.feasible).toBe(false);
    expect(schedule.unmetGoals[0]?.bossId).toBe("reshiram");
  });

  it("recommends a type-matching mega buddy when one is selected", () => {
    // Mega Salamence (Dragon/Flying) can boost Reshiram (Dragon/Fire) raids.
    const resh = input("reshiram", { level: 40, targetLevel: 50 });
    const sala = input("mega-salamence", { megaLevel: 1, targetMegaLevel: 3 });
    const schedule = scheduleFor([resh, sala]);
    const reshRaid = schedule.raids.find((r) => r.bossId === "reshiram");
    expect(reshRaid?.recommendedBuddyMegaId).toBe("mega-salamence");
  });
});

describe("settings", () => {
  it("derives raids/hour from custom raid timing", () => {
    // Full lobby (fastest tier battle = 30s) + quick catch (5s) + no downtime
    // => best-case per raid = 35s.
    const settings: PlannerSettings = {
      ...DEFAULT_SETTINGS,
      lobbySize: 20,
      quickCatch: true,
      downtimeSecRange: { min: 0, max: 0 },
    };
    const cap = computeCapacity(settings);
    const perRaidFast = cap.battleSecRange.min + cap.catchSec; // 30 + 5
    expect(cap.raidsPerHour.max).toBe(Math.floor(3600 / perRaidFast));
    expect(cap.totalRaids.max).toBe(cap.raidsPerHour.max * cap.hoursPerDay * cap.days);
  });

  it("schedules more raids in worst-case than best-case reward planning", () => {
    const resh = input("reshiram", { level: 40, targetLevel: 50 });
    const safe = scheduleFor([resh], { ...DEFAULT_SETTINGS, rewardCase: "safe" });
    const optimistic = scheduleFor([resh], { ...DEFAULT_SETTINGS, rewardCase: "optimistic" });
    expect(safe.raids.length).toBeGreaterThanOrEqual(optimistic.raids.length);
  });
});

describe("computePlanSummary", () => {
  it("ignores unselected bosses and aggregates the rest", () => {
    const a = input("mega-mewtwo-x", { megaLevel: 0, targetMegaLevel: 4 });
    const b = { ...input("reshiram", { level: 40, targetLevel: 50 }), selected: false };
    const summary = computePlanSummary([a, b]);
    expect(summary.results).toHaveLength(1);
    expect(summary.results[0].bossId).toBe("mega-mewtwo-x");
  });
});
