import { describe, expect, it } from "vitest";
import { makeDefaultInput } from "./defaults";
import { getBoss, MEWTWO_X_ID } from "@/data";

describe("makeDefaultInput defaults", () => {
  it("starts a fresh target at current Level 25 (weather-boosted raid catch)", () => {
    const boss = getBoss("reshiram")!;
    expect(makeDefaultInput(boss).current.level).toBe(25);
  });

  it("targets a full Level 50 climb for a 5★ legendary", () => {
    const boss = getBoss("reshiram")!;
    expect(makeDefaultInput(boss).target.level).toBe(50);
  });

  it("also targets Level 50 for a Mega/Super-Mega boss (consistency across the app)", () => {
    const mega = getBoss("mega-salamence")!;
    expect(mega.tier).toBe("mega");
    expect(makeDefaultInput(mega).target.level).toBe(50);
    // Super Mega Mewtwo too, and it still defaults to its tier's mega level.
    const mewtwo = getBoss(MEWTWO_X_ID)!;
    expect(makeDefaultInput(mewtwo).target.level).toBe(50);
    expect(makeDefaultInput(mewtwo).target.megaLevel).toBe(4);
  });
});
