import { beforeEach, describe, expect, it } from "vitest";
import { MEWTWO_X_ID } from "@/data";
import { usePlannerStore } from "./usePlannerStore";
import { serializeState } from "./stateBackup";

const store = () => usePlannerStore.getState();

beforeEach(() => {
  store().resetAll();
});

describe("planner store interactive actions", () => {
  it("toggleSelected selects then deselects a boss", () => {
    expect(store().inputs[MEWTWO_X_ID]?.selected ?? false).toBe(false);
    store().toggleSelected(MEWTWO_X_ID);
    expect(store().inputs[MEWTWO_X_ID].selected).toBe(true);
    store().toggleSelected(MEWTWO_X_ID);
    expect(store().inputs[MEWTWO_X_ID].selected).toBe(false);
  });

  it("setRaidsDone clamps to a non-negative integer", () => {
    store().setRaidsDone("zekrom-standard", 3.7);
    expect(store().raidsDone["zekrom-standard"]).toBe(4);
    store().setRaidsDone("zekrom-standard", -5);
    expect(store().raidsDone["zekrom-standard"]).toBe(0);
    store().setRaidsDone("zekrom-standard", Number.NaN);
    expect(store().raidsDone["zekrom-standard"]).toBe(0);
  });

  it("a manual remote allocation clamps and switches off auto-balance", () => {
    store().setRemoteAuto(true);
    store().setRemoteAllocation("zekrom", -2);
    expect(store().remoteAllocations.zekrom).toBe(0);
    expect(store().remoteAuto).toBe(false); // manual edit takes over
    store().setRemoteAllocation("zekrom", 4.4);
    expect(store().remoteAllocations.zekrom).toBe(4);
  });

  it("setL4Buddy toggles the per-boss Level-4 catch flag", () => {
    store().toggleSelected(MEWTWO_X_ID);
    expect(store().inputs[MEWTWO_X_ID].l4Buddy ?? false).toBe(false);
    store().setL4Buddy(MEWTWO_X_ID, true);
    expect(store().inputs[MEWTWO_X_ID].l4Buddy).toBe(true);
  });

  it("setSettings updates the global mega-buddy level", () => {
    expect(store().settings.megaBuddyLevel).toBe(1); // conservative default
    store().setSettings({ megaBuddyLevel: 3 });
    expect(store().settings.megaBuddyLevel).toBe(3);
  });

  it("setCalibration stores a rounded value and clears on 0", () => {
    store().setCalibration("superMegaEnergy", 432.6);
    expect(store().settings.calibration.superMegaEnergy).toBe(433);
    store().setCalibration("superMegaEnergy", 0);
    expect(store().settings.calibration.superMegaEnergy).toBeUndefined();
  });

  it("serializeState → loadState restores the planning state", () => {
    store().toggleSelected(MEWTWO_X_ID);
    store().setCalibration("megaEnergy", 200);
    store().setRaidsDone("zekrom-standard", 5);
    const snapshot = serializeState();

    store().resetAll();
    expect(store().inputs[MEWTWO_X_ID]?.selected ?? false).toBe(false);

    store().loadState(snapshot);
    expect(store().inputs[MEWTWO_X_ID].selected).toBe(true);
    expect(store().settings.calibration.megaEnergy).toBe(200);
    expect(store().raidsDone["zekrom-standard"]).toBe(5);
  });
});
