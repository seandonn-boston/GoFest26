import { describe, expect, it } from "vitest";
import { isScopeLocal, bossIsLocal, regionScopeLabel } from "./region";
import type { RaidBoss, UserRegion } from "./types";

// Region gating decides which bosses count as local vs remote-only, which in
// turn silently enables remote raids in the store and reshapes the block plan —
// so each axis (hemisphere N/S, hemisphere E/W, continent) is pinned here.

const boston: UserRegion = { label: "Boston, MA (USA)", ns: "N", ew: "W", continent: "americas" };
const sydney: UserRegion = { label: "Sydney (AUS)", ns: "S", ew: "E", continent: "apac" };

const boss = (region?: RaidBoss["region"]): RaidBoss =>
  ({ id: "x", name: "X", types: [], windows: [], counters: [], tier: "five-star", region }) as unknown as RaidBoss;

describe("isScopeLocal", () => {
  it("treats an unscoped boss as available everywhere", () => {
    expect(isScopeLocal(undefined, boston)).toBe(true);
    expect(isScopeLocal({}, sydney)).toBe(true);
  });

  it("gates by north/south hemisphere (Kartana N, Celesteela S)", () => {
    expect(isScopeLocal({ ns: "N" }, boston)).toBe(true);
    expect(isScopeLocal({ ns: "N" }, sydney)).toBe(false);
    expect(isScopeLocal({ ns: "S" }, boston)).toBe(false);
    expect(isScopeLocal({ ns: "S" }, sydney)).toBe(true);
  });

  it("gates by east/west hemisphere (Stakataka E, Blacephalon W)", () => {
    expect(isScopeLocal({ ew: "W" }, boston)).toBe(true);
    expect(isScopeLocal({ ew: "W" }, sydney)).toBe(false);
    expect(isScopeLocal({ ew: "E" }, sydney)).toBe(true);
  });

  it("gates by continent (Buzzwole americas, Xurkitree apac)", () => {
    expect(isScopeLocal({ continent: "americas" }, boston)).toBe(true);
    expect(isScopeLocal({ continent: "americas" }, sydney)).toBe(false);
    expect(isScopeLocal({ continent: "apac" }, sydney)).toBe(true);
    expect(isScopeLocal({ continent: "emea" }, boston)).toBe(false);
  });

  it("requires EVERY specified axis to match", () => {
    expect(isScopeLocal({ ns: "N", ew: "W" }, boston)).toBe(true);
    expect(isScopeLocal({ ns: "N", ew: "E" }, boston)).toBe(false); // ew mismatch
    expect(isScopeLocal({ ns: "S", continent: "americas" }, boston)).toBe(false); // ns mismatch
  });
});

describe("bossIsLocal", () => {
  it("delegates to the boss's region scope", () => {
    expect(bossIsLocal(boss(), boston)).toBe(true);
    expect(bossIsLocal(boss({ continent: "apac" }), boston)).toBe(false);
    expect(bossIsLocal(boss({ continent: "apac" }), sydney)).toBe(true);
  });
});

describe("regionScopeLabel", () => {
  it("labels each scope kind and passes undefined through", () => {
    expect(regionScopeLabel(undefined)).toBeUndefined();
    expect(regionScopeLabel({ continent: "americas" })).toBe("Americas & Greenland");
    expect(regionScopeLabel({ continent: "emea" })).toBe("Europe, Middle East, Africa, India");
    expect(regionScopeLabel({ continent: "apac" })).toBe("Asia-Pacific");
    expect(regionScopeLabel({ ns: "N" })).toBe("Northern Hemisphere");
    expect(regionScopeLabel({ ns: "S" })).toBe("Southern Hemisphere");
    expect(regionScopeLabel({ ew: "E" })).toBe("Eastern Hemisphere");
    expect(regionScopeLabel({ ew: "W" })).toBe("Western Hemisphere");
    expect(regionScopeLabel({})).toBeUndefined();
  });
});
