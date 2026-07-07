import { describe, expect, it } from "vitest";
import { getBoss } from "@/data";
import { makeDefaultInput } from "@/domain/defaults";
import { computePlanSummary, computeRoadPlan, computeBlockPlan } from "@/domain";
import { DEFAULT_SETTINGS } from "@/domain/settings";
import type { BossInput } from "@/domain/types";
import { weekPlanLines } from "./weekPlan";

function plansFor(inputs: BossInput[], playDays: Record<string, boolean> = {}) {
  const settings = DEFAULT_SETTINGS;
  const summary = computePlanSummary(inputs, settings, {});
  const road = computeRoadPlan(inputs, summary.results, summary.capacity, settings, playDays, {}, {}, {}, {}, true, {}, {});
  const weekend = computeBlockPlan(inputs, summary.results, summary.capacity, settings, {}, {}, {}, road.headStart, {});
  return { road, weekend };
}

describe("weekPlanLines", () => {
  it("orders lines chronologically (RoL weekdays → weekend blocks) with stable done keys", () => {
    // Zekrom features Monday's RoL marathon AND weekend blocks. With Monday on,
    // the road line leads; without it, the same demand lands on the weekend.
    const zekrom = makeDefaultInput(getBoss("zekrom")!);
    const monPlans = plansFor([zekrom], { mon: true });
    const withMon = weekPlanLines(monPlans.road, monPlans.weekend);
    expect(withMon.length).toBeGreaterThan(0);
    expect(withMon[0].group).toBe("road");
    expect(withMon[0].dayLabel).toContain("Monday");
    expect(withMon[0].doneKey).toBe("zekrom@mon");

    // Weekend lines keep the block accordion's historical key format
    // (bossId@sat6-style), so previously logged raids still count.
    const wkPlans = plansFor([zekrom]);
    const weekendOnly = weekPlanLines(wkPlans.road, wkPlans.weekend);
    const weekendLine = weekendOnly.find((l) => l.group === "sat" || l.group === "sun")!;
    expect(weekendLine).toBeTruthy();
    expect(weekendLine.doneKey).toMatch(/^zekrom@(sat|sun)\d+$/);

    // Every line carries a positive target and a resolvable boss.
    for (const l of [...withMon, ...weekendOnly]) {
      expect(l.target).toBeGreaterThan(0);
      expect(l.bossName.length).toBeGreaterThan(0);
    }
  });

  it("keys a Road-of-Legends energy raid by its pseudo-id so it can't collide with the base species", () => {
    // Kyurem with a fusion energy goal on: Tuesday's raid hour banks White
    // Kyurem energy — that line must key as energy:kyurem:<key>@tue, distinct
    // from any kyurem candy line the same day.
    const kyurem = makeDefaultInput(getBoss("kyurem")!);
    const energyKeys = Object.keys(kyurem.energy ?? {});
    if (!energyKeys.length) return; // roster shape changed — nothing to pin here
    const withGoal: BossInput = {
      ...kyurem,
      energy: Object.fromEntries(Object.entries(kyurem.energy!).map(([k, v]) => [k, { ...v, on: true }])),
    };
    const { road, weekend } = plansFor([withGoal], { tue: true, wed: true });
    const energyLine = weekPlanLines(road, weekend).find((l) => l.doneKey.startsWith("energy:kyurem:"));
    expect(energyLine).toBeTruthy();
    expect(energyLine!.doneKey).toMatch(/^energy:kyurem:[\w-]+@(tue|wed)$/);
    expect(energyLine!.banks).toContain("Energy + Candy");
  });

  it("appends the remote pool as Any-day lines keyed bossId@remote", () => {
    // Region-locked Xurkitree with remote raids on → a remote line.
    const settings = { ...DEFAULT_SETTINGS, useRemoteRaids: true, remoteRaidPassesPlanned: 20 };
    const inputs = [makeDefaultInput(getBoss("xurkitree")!)];
    const summary = computePlanSummary(inputs, settings, { xurkitree: 10 });
    const road = computeRoadPlan(
      inputs,
      summary.results,
      summary.capacity,
      settings,
      {},
      {},
      { xurkitree: 10 },
      {},
      {},
      true,
      {},
      {},
    );
    const weekend = computeBlockPlan(
      inputs,
      summary.results,
      summary.capacity,
      settings,
      {},
      { xurkitree: 10 },
      {},
      road.headStart,
      {},
    );
    const lines = weekPlanLines(road, weekend);
    const remote = lines.find((l) => l.group === "remote");
    expect(remote).toBeTruthy();
    expect(remote!.doneKey).toBe("xurkitree@remote");
    expect(remote!.pass).toBe("Remote");
    expect(remote!.target).toBeGreaterThan(0);
  });
});
