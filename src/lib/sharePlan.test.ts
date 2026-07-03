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
  it("round-trips a plan through the #plan= payload losslessly", async () => {
    const backup = sample();
    const hash = `#plan=${await encodePlanPayload(backup)}`;
    expect(await decodeSharedPlan(hash)).toEqual(backup);
  });

  it("survives a payload sitting alongside other hash params", async () => {
    const backup = sample();
    const hash = `#foo=1&plan=${await encodePlanPayload(backup)}&bar=2`;
    expect((await decodeSharedPlan(hash))?.inputs.zekrom.target.level).toBe(50);
  });

  it("preserves non-ASCII text (UTF-8 safe)", async () => {
    const backup = sample();
    backup.inputs.zekrom.bossId = "Pokémon★Mewtwo";
    const decoded = await decodeSharedPlan(`#plan=${await encodePlanPayload(backup)}`);
    expect(decoded?.inputs.zekrom.bossId).toBe("Pokémon★Mewtwo");
  });

  it("gzips the payload much shorter than raw base64, and still decodes", async () => {
    // A larger, repetitive plan compresses well — the whole point of the change.
    const backup = sample();
    for (let i = 0; i < 30; i++) {
      backup.inputs[`boss${i}`] = { ...backup.inputs.zekrom, bossId: `boss${i}` };
    }
    const rawLen = Buffer.from(JSON.stringify(backup)).toString("base64url").length;
    const gz = await encodePlanPayload(backup);
    expect(gz.length).toBeLessThan(rawLen * 0.6); // meaningfully shorter
    expect(await decodeSharedPlan(`#plan=${gz}`)).toEqual(backup);
  });

  it("still decodes a LEGACY uncompressed link (backward compatible)", async () => {
    // Old links carried plain base64url of the JSON (no gzip). Those must still open.
    const backup = sample();
    const legacy = Buffer.from(JSON.stringify(backup)).toString("base64url");
    expect(await decodeSharedPlan(`#plan=${legacy}`)).toEqual(backup);
  });

  it("returns null when there is no plan param", async () => {
    expect(await decodeSharedPlan("#nothing=here")).toBeNull();
    expect(await decodeSharedPlan("")).toBeNull();
  });

  it("returns null for a corrupt or non-backup payload (never throws)", async () => {
    expect(await decodeSharedPlan("#plan=not-valid-base64!!")).toBeNull();
    // valid base64url of JSON that isn't a backup shape
    const notBackup = Buffer.from(JSON.stringify({ hello: "world" })).toString("base64url");
    expect(await decodeSharedPlan(`#plan=${notBackup}`)).toBeNull();
  });
});
