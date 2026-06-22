import { describe, expect, it } from "vitest";
import { encodePlanPayload, decodeSharedPlan } from "./sharePlan";
import { BACKUP_APP, BACKUP_VERSION, type StateBackup } from "@/store/stateBackup";

const sample = (): StateBackup => ({
  app: BACKUP_APP,
  version: BACKUP_VERSION,
  savedAt: "2026-06-22T00:00:00.000Z",
  inputs: {
    zekrom: {
      bossId: "zekrom",
      selected: true,
      counts: { standard: 1, shadow: 0, purified: 0 },
      current: { candy: 0, xlCandy: 12, megaEnergy: 0, level: 40, megaLevel: 0 },
      target: { level: 50, megaLevel: 0 },
    },
  },
  settings: { calibration: { superMegaEnergy: 430 } } as StateBackup["settings"],
  research: {},
  blockPriority: { sat0: ["zekrom"] },
  quickCatchBlocks: {},
  remoteAllocations: { zekrom: 3 },
  remoteAuto: false,
  raidsDone: { "zekrom-standard": 2 },
  playDays: { mon: true },
});

describe("sharePlan encode/decode", () => {
  it("round-trips a plan through the #plan= payload losslessly", () => {
    const backup = sample();
    const hash = `#plan=${encodePlanPayload(backup)}`;
    expect(decodeSharedPlan(hash)).toEqual(backup);
  });

  it("survives a payload sitting alongside other hash params", () => {
    const backup = sample();
    const hash = `#foo=1&plan=${encodePlanPayload(backup)}&bar=2`;
    expect(decodeSharedPlan(hash)?.inputs.zekrom.target.level).toBe(50);
  });

  it("preserves non-ASCII text (UTF-8 safe)", () => {
    const backup = sample();
    backup.inputs.zekrom.bossId = "Pokémon★Mewtwo";
    const decoded = decodeSharedPlan(`#plan=${encodePlanPayload(backup)}`);
    expect(decoded?.inputs.zekrom.bossId).toBe("Pokémon★Mewtwo");
  });

  it("returns null when there is no plan param", () => {
    expect(decodeSharedPlan("#nothing=here")).toBeNull();
    expect(decodeSharedPlan("")).toBeNull();
  });

  it("returns null for a corrupt or non-backup payload (never throws)", () => {
    expect(decodeSharedPlan("#plan=not-valid-base64!!")).toBeNull();
    // valid base64url of JSON that isn't a backup shape
    const notBackup = Buffer.from(JSON.stringify({ hello: "world" })).toString("base64url");
    expect(decodeSharedPlan(`#plan=${notBackup}`)).toBeNull();
  });
});
