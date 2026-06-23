import { describe, expect, it } from "vitest";
import {
  explainTotalRaids,
  explainRaidsPerHour,
  explainMaxRaids,
  explainUtilization,
  explainGoalProgress,
  explainPassCost,
} from "./explainPlan";
import { computeCapacity } from "./capacity";
import type { Explanation } from "./explainPlan";
import type { PassCost } from "./passEconomy";

/** Flattens an explanation's tokens into one searchable string. */
const text = (e: Explanation) =>
  e.lines
    .map((l) => l.tokens.map((t) => (t.t === "text" ? t.s : t.t === "out" ? t.s : String((t as { n: number }).n))).join(" "))
    .join(" | ");

describe("explainTotalRaids", () => {
  it("lists each contributing boss and a total when more than one", () => {
    const exp = explainTotalRaids(
      [
        { name: "Zekrom", raids: { min: 4, max: 6 } },
        { name: "Reshiram", raids: { min: 2, max: 2 } },
        { name: "Idle", raids: { min: 0, max: 0 } }, // filtered out
      ],
      { min: 6, max: 8 },
    );
    const t = text(exp);
    expect(t).toContain("Zekrom");
    expect(t).toContain("Reshiram");
    expect(t).not.toContain("Idle");
    expect(t).toContain("6–8 raids");
  });

  it("omits the total line for a single boss", () => {
    const exp = explainTotalRaids([{ name: "Zekrom", raids: { min: 4, max: 4 } }], { min: 4, max: 4 });
    expect(exp.lines).toHaveLength(1);
  });
});

describe("explainRaidsPerHour / explainMaxRaids", () => {
  const cap = computeCapacity();

  it("derives raids/hour from battle + catch + downtime and matches the model", () => {
    const exp = explainRaidsPerHour(cap);
    const t = text(exp);
    expect(t).toContain(`${cap.raidsPerHour.max}/h`);
    expect(t).toContain(`${cap.raidsPerHour.min}/h`);
  });

  it("explains max raids as capacity, with a remote line only when pooled", () => {
    const noRemote = explainMaxRaids(cap, 0, cap.totalRaids);
    expect(noRemote.lines).toHaveLength(1);

    const pooled = { min: cap.totalRaids.min + 30, max: cap.totalRaids.max + 30 };
    const withRemote = explainMaxRaids(cap, 30, pooled);
    expect(withRemote.lines).toHaveLength(2);
    expect(text(withRemote)).toContain("remote");
  });
});

describe("explainUtilization", () => {
  it("renders the percentage shown on the gauge", () => {
    const exp = explainUtilization({ min: 50, max: 70 }, { min: 100, max: 140 }, 0.5);
    expect(text(exp)).toContain("50%");
  });
});

describe("explainGoalProgress", () => {
  it("shows achievable / required and the percentage", () => {
    const exp = explainGoalProgress(3, 4);
    const t = text(exp);
    expect(t).toContain("3");
    expect(t).toContain("4");
    expect(t).toContain("75%");
  });

  it("treats a zero requirement as complete", () => {
    expect(text(explainGoalProgress(0, 0))).toContain("100%");
  });
});

describe("explainPassCost", () => {
  const cost: PassCost = {
    inPersonRaids: 20,
    remoteNormalRaids: 2,
    remoteSuperMegaRaids: 1,
    superMegaInPersonRaids: 0,
    freePasses: 22,
    freePassesUsed: 18,
    paidInPerson: 2,
    totalRemote: 3,
    linkChargesNeeded: 800,
    weekdaysPlayed: 2,
    hasCost: true,
    low: { greenCoins: 100, remoteCoins: 525, linkChargeCoins: 350, total: 975, methods: [] },
    high: { greenCoins: 167, remoteCoins: 525, linkChargeCoins: 350, total: 1042, methods: [] },
  };

  it("breaks the bill into free, premium, remote and link-charge lines", () => {
    const t = text(explainPassCost(cost));
    expect(t).toContain("Free daily passes used:");
    expect(t).toContain("Premium");
    expect(t).toContain("Remote");
    expect(t).toContain("Link Charges");
    expect(t).toContain("975"); // lowest total
    expect(t).toContain("1,042"); // highest total, localized
  });
});
