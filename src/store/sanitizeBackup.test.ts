import { describe, expect, it } from "vitest";
import { MEWTWO_X_ID } from "@/data";
import { DEFAULT_SETTINGS } from "@/domain/settings";
import { DEFAULT_REGION } from "@/data/locations";
import { sanitizeBackup } from "./sanitizeBackup";
import { BACKUP_APP, type StateBackup } from "./stateBackup";

// A backup is only loosely shape-checked before it reaches the store, and it's
// attacker-reachable (uploaded .json/.xlsx, or a #plan= share link). These tests
// pin down that a crafted/malformed payload is coerced into a valid shape rather
// than seeding bad types, polluting the prototype, or crashing a render.

/** Build a backup with arbitrary (possibly invalid) field overrides. */
function backup(over: Record<string, unknown>): StateBackup {
  return {
    app: BACKUP_APP,
    version: 1,
    savedAt: "2026-06-26T00:00:00.000Z",
    inputs: {},
    settings: { ...DEFAULT_SETTINGS },
    research: {},
    blockPriority: {},
    quickCatchBlocks: {},
    remoteAllocations: {},
    remoteAuto: false,
    raidsDone: {},
    ...over,
  } as StateBackup;
}

describe("sanitizeBackup", () => {
  it("round-trips a well-formed backup without losing valid data", () => {
    const b = backup({
      inputs: { [MEWTWO_X_ID]: { selected: true, quantity: 2 } },
      globalPriority: [MEWTWO_X_ID],
      raidsDone: { "zekrom@sat0": 3 },
      remoteAllocations: { zekrom: 5 },
      remoteAuto: true,
      playDays: { mon: true },
    });
    const out = sanitizeBackup(b);
    expect(out.inputs[MEWTWO_X_ID].selected).toBe(true);
    expect(out.inputs[MEWTWO_X_ID].quantity).toBe(2);
    expect(out.inputs[MEWTWO_X_ID].bossId).toBe(MEWTWO_X_ID);
    expect(out.globalPriority).toEqual([MEWTWO_X_ID]);
    expect(out.raidsDone["zekrom@sat0"]).toBe(3);
    expect(out.remoteAllocations.zekrom).toBe(5);
    expect(out.remoteAuto).toBe(true);
    expect(out.playDays?.mon).toBe(true);
  });

  it("round-trips the Road of Legends coupling fields and defaults them when missing", () => {
    const on = sanitizeBackup(
      backup({ roadCoupled: false, roadSelected: { zekrom: true, bad: "x" }, roadEnergy: { kyurem: ["blaze"] } }),
    );
    expect(on.roadCoupled).toBe(false);
    expect(on.roadSelected).toEqual({ zekrom: true }); // non-boolean stripped
    expect(on.roadEnergy).toEqual({ kyurem: ["blaze"] });

    // Absent in an older backup → coupled by default, empty sets.
    const missing = sanitizeBackup(backup({}));
    expect(missing.roadCoupled).toBe(true);
    expect(missing.roadSelected).toEqual({});
    expect(missing.roadEnergy).toEqual({});
  });

  it("drops unknown boss ids, including __proto__", () => {
    const b = backup({
      inputs: {
        "not-a-real-boss": { selected: true },
        __proto__: { selected: true },
        [MEWTWO_X_ID]: { selected: true },
      },
    });
    const out = sanitizeBackup(b);
    expect(Object.keys(out.inputs)).toEqual([MEWTWO_X_ID]);
    // No prototype pollution leaked through.
    expect(({} as Record<string, unknown>).selected).toBeUndefined();
  });

  it("backfills a partial input that's missing current/target/counts", () => {
    const b = backup({ inputs: { [MEWTWO_X_ID]: { selected: true } } });
    const out = sanitizeBackup(b);
    const input = out.inputs[MEWTWO_X_ID];
    expect(typeof input.current.level).toBe("number");
    expect(typeof input.current.megaLevel).toBe("number");
    expect(typeof input.target.level).toBe("number");
    expect(input.counts.standard).toBeGreaterThanOrEqual(0);
    expect(input.counts.shadow).toBeGreaterThanOrEqual(0);
    expect(input.counts.purified).toBeGreaterThanOrEqual(0);
  });

  it("coerces garbage field types into valid ones", () => {
    const b = backup({
      inputs: {
        [MEWTWO_X_ID]: {
          selected: "yes", // not a boolean
          quantity: -4, // must clamp to >= 1
          counts: { standard: -2, shadow: "x", purified: 1.5 },
          current: { candy: -10, level: "forty" },
          copies: "not-an-array",
        },
      },
    });
    const out = sanitizeBackup(b);
    const input = out.inputs[MEWTWO_X_ID];
    expect(typeof input.selected).toBe("boolean");
    expect(input.quantity).toBeGreaterThanOrEqual(1);
    expect(input.counts.standard).toBe(0);
    expect(input.counts.shadow).toBeGreaterThanOrEqual(0);
    expect(input.current.candy).toBe(0);
    expect(typeof input.current.level).toBe("number");
    expect(input.copies).toBeUndefined();
  });

  it("falls back to the default region for a garbage region", () => {
    const b = backup({ settings: { ...DEFAULT_SETTINGS, region: { ns: "Q", continent: "atlantis" } } });
    const out = sanitizeBackup(b);
    expect(out.settings.region.ns).toBe(DEFAULT_REGION.ns);
    expect(out.settings.region.continent).toBe(DEFAULT_REGION.continent);
  });

  it("rebuilds settings over defaults when settings is missing/non-object", () => {
    const out = sanitizeBackup(backup({ settings: undefined as unknown as StateBackup["settings"] }));
    expect(out.settings.lobbySize).toBe(DEFAULT_SETTINGS.lobbySize);
    expect(out.settings.region).toEqual(DEFAULT_REGION);
  });

  it("strips non-string entries from array fields and bad keys from records", () => {
    const b = backup({
      globalPriority: [MEWTWO_X_ID, 42, null, "ghost-boss"],
      raidsDone: { good: 3, bad: "x", __proto__: 9 },
      playDays: { mon: true, tue: "nope" },
    });
    const out = sanitizeBackup(b);
    expect(out.globalPriority).toEqual([MEWTWO_X_ID, "ghost-boss"]);
    expect(out.raidsDone).toEqual({ good: 3 });
    expect(out.playDays).toEqual({ mon: true });
  });

  it("never throws on a hostile payload", () => {
    expect(() =>
      sanitizeBackup(
        backup({
          inputs: { [MEWTWO_X_ID]: null, x: [], y: 42 } as unknown as StateBackup["inputs"],
          settings: 7 as unknown as StateBackup["settings"],
          research: "no" as unknown as StateBackup["research"],
          blockPriority: [] as unknown as StateBackup["blockPriority"],
        }),
      ),
    ).not.toThrow();
  });
});
