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

  it("setVariant sets the target's form (drives the XL total)", () => {
    store().toggleSelected(MEWTWO_X_ID);
    expect(store().inputs[MEWTWO_X_ID].variant ?? "standard").toBe("standard");
    store().setVariant(MEWTWO_X_ID, "shadow");
    expect(store().inputs[MEWTWO_X_ID].variant).toBe("shadow");
  });

  it("addCopy seeds copy #1 from current then appends; removeCopy collapses back", () => {
    store().toggleSelected("zekrom");
    store().setCurrent("zekrom", "level", 45);
    store().addCopy("zekrom");
    const copies = store().inputs.zekrom.copies!;
    expect(copies).toHaveLength(2);
    expect(copies[0].current.level).toBe(45); // copy #1 seeded from the single fields
    // Removing back to one collapses to the simple card (copies cleared).
    store().removeCopy("zekrom", copies[1].id);
    expect(store().inputs.zekrom.copies).toBeUndefined();
    expect(store().inputs.zekrom.current.level).toBe(45);
  });

  it("moveCopy reorders priority and updateCopy patches a field", () => {
    store().toggleSelected("zekrom");
    store().addCopy("zekrom");
    store().addCopy("zekrom"); // now 3 individuals
    const [a, b] = store().inputs.zekrom.copies!;
    store().updateCopy("zekrom", b.id, { variant: "shadow", level: 30 });
    store().moveCopy("zekrom", b.id, -1); // b becomes #1
    const after = store().inputs.zekrom.copies!;
    expect(after[0].id).toBe(b.id);
    expect(after[0].variant).toBe("shadow");
    expect(after[0].current.level).toBe(30);
    expect(after[1].id).toBe(a.id);
  });

  it("addMewtwoCopy seeds from both forms; removeMewtwoCopy collapses to both inputs", () => {
    store().toggleSelected("mega-mewtwo-x");
    store().toggleSelected("mega-mewtwo-y");
    store().setCurrent("mega-mewtwo-x", "megaLevel", 2); // X branch
    store().setCurrent("mega-mewtwo-y", "megaLevel", 0);
    store().addMewtwoCopy();
    const copies = store().inputs["mega-mewtwo-x"].copies!;
    expect(copies).toHaveLength(2);
    expect(copies[0].current.megaLevel).toBe(2); // seeded X from the X input
    expect(copies[0].current.megaLevelY).toBe(0); // seeded Y from the Y input
    // Collapse: removing back to one restores X/Y mega levels onto each input.
    store().updateMewtwoCopy(copies[1].id, { megaLevelY: 3, megaLevel: 0 });
    store().removeMewtwoCopy(copies[0].id);
    expect(store().inputs["mega-mewtwo-x"].copies).toBeUndefined();
    expect(store().inputs["mega-mewtwo-y"].current.megaLevel).toBe(3); // Y restored
  });

  it("updateMewtwoCopy patches the independent X and Y branches", () => {
    store().toggleSelected("mega-mewtwo-x");
    store().toggleSelected("mega-mewtwo-y");
    store().addMewtwoCopy();
    const id = store().inputs["mega-mewtwo-x"].copies![1].id;
    store().updateMewtwoCopy(id, { megaLevel: 1, megaLevelY: 3 });
    const c = store().inputs["mega-mewtwo-x"].copies!.find((x) => x.id === id)!;
    expect(c.current.megaLevel).toBe(1);
    expect(c.current.megaLevelY).toBe(3);
  });

  it("setL4Buddy toggles the per-boss Level-4 catch flag", () => {
    store().toggleSelected(MEWTWO_X_ID);
    expect(store().inputs[MEWTWO_X_ID].l4Buddy ?? false).toBe(false);
    store().setL4Buddy(MEWTWO_X_ID, true);
    expect(store().inputs[MEWTWO_X_ID].l4Buddy).toBe(true);
  });

  it("setSettings updates the global mega-buddy level", () => {
    expect(store().settings.megaBuddyLevel).toBe(3); // L3 "standard" default
    store().setSettings({ megaBuddyLevel: 2 });
    expect(store().settings.megaBuddyLevel).toBe(2);
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
