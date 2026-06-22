// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SharedPlanBanner } from "./SharedPlanBanner";
import { usePlannerStore } from "@/store/usePlannerStore";
import { encodePlanPayload } from "@/lib/sharePlan";
import { BACKUP_APP, BACKUP_VERSION, type StateBackup } from "@/store/stateBackup";

const sharedPlan = (): StateBackup => ({
  app: BACKUP_APP,
  version: BACKUP_VERSION,
  savedAt: "2026-06-22T00:00:00.000Z",
  inputs: {
    zekrom: {
      bossId: "zekrom",
      selected: true,
      counts: { standard: 1, shadow: 0, purified: 0 },
      current: { candy: 0, xlCandy: 0, megaEnergy: 0, level: 40, megaLevel: 0 },
      target: { level: 50, megaLevel: 0 },
    },
  },
  settings: {} as StateBackup["settings"],
  research: {},
  blockPriority: {},
  quickCatchBlocks: {},
  remoteAllocations: {},
  remoteAuto: false,
  raidsDone: {},
});

afterEach(() => {
  history.replaceState(null, "", "/");
  usePlannerStore.getState().resetAll();
});

describe("<SharedPlanBanner>", () => {
  it("renders nothing when the hash has no shared plan", () => {
    const { container } = render(<SharedPlanBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("loads the shared plan on confirm and strips the hash", async () => {
    window.location.hash = `#plan=${encodePlanPayload(sharedPlan())}`;
    render(<SharedPlanBanner />);

    fireEvent.click(await screen.findByText("Open shared plan"));

    expect(usePlannerStore.getState().inputs.zekrom.selected).toBe(true);
    expect(window.location.hash).toBe("");
  });

  it("keeps the local plan untouched on dismiss", async () => {
    window.location.hash = `#plan=${encodePlanPayload(sharedPlan())}`;
    render(<SharedPlanBanner />);

    fireEvent.click(await screen.findByText("Keep mine"));

    expect(usePlannerStore.getState().inputs.zekrom?.selected ?? false).toBe(false);
  });
});
