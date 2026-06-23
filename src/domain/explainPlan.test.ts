import { describe, expect, it } from "vitest";
import {
  explainTotalRaids,
  explainRaidsPerHour,
  explainMaxRaids,
  explainUtilization,
  explainGoalProgress,
  explainPassCost,
  explainRareCandy,
  explainRoadDay,
  explainHeadStart,
  explainBlockFit,
  explainRemoteFit,
  explainBlockShare,
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

describe("explainRareCandy", () => {
  it("shows both Rare Candy and Rare Candy XL totals", () => {
    const t = text(explainRareCandy(40, 25));
    expect(t).toContain("40");
    expect(t).toContain("25");
  });
});

describe("explainRoadDay", () => {
  it("shows the time budget, demand, and what fit", () => {
    const t = text(explainRoadDay(10, { min: 6, max: 8 }, 8, 2));
    expect(t).toContain("6–8");
    expect(t).toContain("10");
    expect(t).toContain("8");
    expect(t).toContain("2 over");
  });

  it("omits the over-budget line when everything fits", () => {
    const exp = explainRoadDay(5, { min: 6, max: 8 }, 5, 0);
    expect(exp.lines).toHaveLength(2);
  });
});

describe("explainHeadStart", () => {
  it("lists only the days that contributed, then the total", () => {
    const exp = explainHeadStart(
      [
        { label: "Monday", fitted: 4 },
        { label: "Tuesday", fitted: 0 },
        { label: "Friday", fitted: 3 },
      ],
      7,
    );
    const t = text(exp);
    expect(t).toContain("Monday");
    expect(t).toContain("Friday");
    expect(t).not.toContain("Tuesday");
    expect(t).toContain("7 raids");
  });
});

describe("explainBlockFit", () => {
  it("reports a shortfall when demand exceeds what fits", () => {
    const t = text(explainBlockFit({ min: 10, max: 14 }, 18, 14, 4));
    expect(t).toContain("10–14");
    expect(t).toContain("won't fit");
  });

  it("reports spare capacity when everything fits", () => {
    const t = text(explainBlockFit({ min: 10, max: 14 }, 6, 6, 0));
    expect(t).toContain("to spare");
  });
});

describe("explainRemoteFit", () => {
  it("shows the time budget and beyond-time overflow", () => {
    const t = text(explainRemoteFit(30, 35, 30, 5));
    expect(t).toContain("30");
    expect(t).toContain("beyond your remote time");
  });
});

describe("explainBlockShare", () => {
  it("shows the candy-luck range (with a clamped average) and what fits", () => {
    const exp = explainBlockShare("Zekrom", 5, { min: 4, max: 6 }, 5, 0);
    expect(exp.title).toContain("Zekrom");
    const t = text(exp);
    expect(t).toContain("4"); // best
    expect(t).toContain("5"); // avg / fits
    expect(t).toContain("6"); // worst
  });
});
