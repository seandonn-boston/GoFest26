import type ExcelJS from "exceljs";
import { GAME_CONFIG } from "@/data/config";
import { getBoss } from "@/data";
import { energyGoalsFor } from "@/data/energyGoals";
import { ESTIMATE_NOTES, CONFIDENCE_META } from "@/data/estimateConfidence";
import { formatRange, hourLabel } from "@/lib/format";
import { bossIsLocal } from "@/domain/region";
import { remoteWindowsForBoss } from "@/domain/remoteWindows";
import { computeCommitment, commitmentByBoss, computePassCost } from "@/domain";
import { sized } from "@/domain/blockPlan";
import type { RoadPlan, WeekendBlockPlan, RoadDayPlan, BlockSpeciesShare } from "@/domain";
import type { PlannerSettings } from "@/domain/settings";
import type { BossInput, Currency, PlanSummary } from "@/domain/types";

/**
 * Everything the workbook is built from — the SAME computed plan the UI renders
 * (Road of Legends days + weekend blocks + committed pass math), so the export
 * can never disagree with the site. The legacy per-raid `summary.schedule` is
 * deliberately not used.
 */
export interface WorkbookContext {
  summary: PlanSummary;
  inputs: BossInput[];
  weekend: WeekendBlockPlan;
  road: RoadPlan;
  settings: PlannerSettings;
  remoteAllocations: Record<string, number>;
  playDays: Record<string, boolean>;
}

const DAY_LABEL: Record<string, string> = {
  sat: "Sat · Jul 11",
  sun: "Sun · Jul 12",
};

const CURRENCY_LABEL: Record<Currency, string> = {
  candy: "Candy",
  xlCandy: "XL Candy",
  megaEnergy: "Mega Energy",
};

const REWARD_CASE_LABEL: Record<PlannerSettings["rewardCase"], string> = {
  optimistic: "Best case (luckiest drops)",
  expected: "Expected (middle of the range)",
  safe: "Worst case (coldest drops)",
};

// Palette (ARGB) — dark header + soft day bands + status fills.
const C = {
  header: "FF1C2545",
  white: "FFFFFFFF",
  road: "FFFDF3E7", // weekday rows: warm sand
  sat: "FFEAF3FB", // Saturday rows: light sky
  sun: "FFF3EDFA", // Sunday rows: light violet
  remote: "FFE9F8F1", // remote rows: light mint
  done: "FFC6EFCE", // Excel's classic "good" green
  doneFont: "FF006100",
  short: "FF9C0006", // Excel's classic "bad" red
  subtle: "FF6B7280",
};

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true, color: { argb: C.white } };
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.header } };
    cell.alignment = { vertical: "middle" };
  });
}

function fillRow(row: ExcelJS.Row, argb: string): void {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } };
  });
}

/** "6–7 PM · 5★ hour" / "6–8 PM · 5★ marathon" / "7–8 PM · Mega & Primal hour". */
function roadWindow(day: RoadDayPlan, share: BlockSpeciesShare): string {
  const megaHour = "7–8 PM · Mega & Primal hour";
  if (share.energyKey) {
    const def = energyGoalsFor(share.bossId).find((d) => d.key === share.energyKey);
    return def?.kind === "primal" ? megaHour : day.id === "mon" ? "6–8 PM · 5★ marathon" : "6–7 PM · 5★ hour";
  }
  const boss = getBoss(share.formeBossId ?? share.bossId);
  if (boss?.tier === "mega" || boss?.tier === "super-mega") return megaHour;
  return day.id === "mon" ? "6–8 PM · 5★ marathon" : "6–7 PM · 5★ hour";
}

/** What one raid of this row banks, e.g. "Fusion Energy + Candy" / "Candy + XL". */
function banksLabel(share: BlockSpeciesShare): string {
  if (share.energyKey) {
    const def = energyGoalsFor(share.bossId).find((d) => d.key === share.energyKey);
    const kind = def?.kind === "primal" ? "Primal" : def?.kind === "crowned" ? "Crowned" : "Fusion";
    return `${kind} Energy + Candy`;
  }
  const boss = getBoss(share.formeBossId ?? share.bossId);
  const currencies = boss?.rewardsCurrencies ?? ["candy", "xlCandy"];
  return currencies.map((c) => CURRENCY_LABEL[c]).join(" + ");
}

function countersLabel(share: BlockSpeciesShare): string {
  const boss = getBoss(share.formeBossId ?? share.bossId);
  return (boss?.bestCounters ?? []).slice(0, 4).join(", ");
}

/** One Week Plan line before it becomes a worksheet row. */
interface PlanLine {
  day: string;
  window: string;
  boss: string;
  target: number;
  banks: string;
  pass: string;
  counters: string;
  band: string; // row fill
}

/** Populates the workbook: Overview, Week Plan (tracker), Remote Windows, Goals,
 *  Cost and Assumptions — all derived from the same plan the app displays. */
export function buildWorkbook(workbook: ExcelJS.Workbook, ctx: WorkbookContext): void {
  const { summary, inputs, weekend, road, settings, remoteAllocations, playDays } = ctx;
  workbook.creator = "GO Fest 2026 Raid Planner";
  workbook.created = new Date();

  const startLocal = GAME_CONFIG.event.hourStartLocal;
  const inputById = new Map(inputs.map((i) => [i.bossId, i]));
  const commitment = computeCommitment(weekend, road);
  const cost = computePassCost(
    inputs,
    summary.results,
    settings,
    remoteAllocations,
    playDays,
    commitmentByBoss(weekend, road),
  );

  // ---- Collect the chronological Week Plan lines (Mon → Sun → Remote). ----
  const lines: PlanLine[] = [];
  for (const day of road.days) {
    for (const s of day.species) {
      if (s.fitted <= 0) continue;
      lines.push({
        day: `${day.label} · ${day.dateLabel}`,
        window: roadWindow(day, s),
        boss: s.bossName,
        target: s.fitted,
        banks: banksLabel(s),
        pass: "In-person",
        counters: countersLabel(s),
        band: C.road,
      });
    }
  }
  for (const block of weekend.blocks) {
    for (const s of block.species) {
      if (s.fitted <= 0) continue;
      lines.push({
        day: DAY_LABEL[block.day] ?? block.day,
        window: `${block.name} · ${hourLabel(block.startHour, startLocal)}–${hourLabel(block.endHour, startLocal)}`,
        boss: s.bossName,
        target: s.fitted,
        banks: banksLabel(s),
        pass: "In-person",
        counters: countersLabel(s),
        band: block.day === "sat" ? C.sat : C.sun,
      });
    }
  }
  for (const s of weekend.remote?.species ?? []) {
    if (s.fitted <= 0) continue;
    lines.push({
      day: "Any day",
      window: "Remote — any time (Jul 6–12)",
      boss: s.bossName,
      target: s.fitted,
      banks: banksLabel(s),
      pass: "Remote",
      counters: countersLabel(s),
      band: C.remote,
    });
  }

  // ---------------- Sheet 1: Overview ----------------
  const overview = workbook.addWorksheet("Overview");
  overview.columns = [
    { header: "GO Fest 2026 Raid Plan", key: "metric", width: 40 },
    { header: "", key: "value", width: 34 },
  ];
  styleHeader(overview.getRow(1));

  const lastPlanRow = 1 + lines.length;
  const ovRows: [string, string | number | { formula: string }][] = [
    ["Event", `${GAME_CONFIG.event.name} + Road of Legends week`],
    ["Dates", `Jul 6–10 (raid week) · ${GAME_CONFIG.event.dateLabel}`],
    ["Planning luck case", REWARD_CASE_LABEL[settings.rewardCase]],
    ["", ""],
    ["Total raids your goals need", formatRange(summary.totalRaids)],
    ["Raids this plan commits to", `${commitment.inPerson} in-person + ${commitment.remote} remote`],
    ["— Road of Legends (Mon–Fri)", commitment.roadInPerson],
    ["— GO Fest weekend blocks", commitment.weekendInPerson],
    ["", ""],
    ["Free daily passes used", `${cost.freePassesUsed} of ${cost.freePasses}`],
    ["Owned passes used", `${cost.ownedPassesUsed} of ${cost.ownedInPersonPasses}`],
    ["Green passes to BUY", cost.paidInPerson],
    ["Remote passes to buy", cost.totalRemote],
    ["Estimated coins", cost.low.total === cost.high.total ? cost.low.total : `${cost.low.total}–${cost.high.total}`],
    ["", ""],
    ["Raids done so far (fills as you track)", { formula: `SUM('Week Plan'!E2:E${lastPlanRow})` }],
    ["Raids remaining", { formula: `${commitment.total}-SUM('Week Plan'!E2:E${lastPlanRow})` }],
    ["", ""],
    ["How to use", "Fill the Done column on the Week Plan sheet as you raid — rows turn green when a line is finished."],
  ];
  for (const [metric, value] of ovRows) overview.addRow({ metric, value });
  overview.getColumn(1).font = { bold: true };

  // ---------------- Sheet 2: Week Plan (the tracker) ----------------
  const plan = workbook.addWorksheet("Week Plan");
  plan.columns = [
    { header: "Day", key: "day", width: 16 },
    { header: "Window", key: "window", width: 34 },
    { header: "Boss", key: "boss", width: 26 },
    { header: "Raids", key: "target", width: 8 },
    { header: "Done", key: "done", width: 8 },
    { header: "Left", key: "left", width: 8 },
    { header: "Banks", key: "banks", width: 22 },
    { header: "Pass", key: "pass", width: 11 },
    { header: "Top counters", key: "counters", width: 44 },
  ];
  styleHeader(plan.getRow(1));

  lines.forEach((l, i) => {
    const rowIdx = i + 2;
    const row = plan.addRow({
      day: l.day,
      window: l.window,
      boss: l.boss,
      target: l.target,
      done: "",
      left: { formula: `MAX(0,D${rowIdx}-N(E${rowIdx}))` },
      banks: l.banks,
      pass: l.pass,
      counters: l.counters,
    });
    fillRow(row, l.band);
  });
  plan.views = [{ state: "frozen", ySplit: 1 }];
  plan.autoFilter = `A1:I${Math.max(2, lastPlanRow)}`;
  if (lines.length > 0) {
    // A finished line (Left = 0) turns green — the offline progress signal.
    plan.addConditionalFormatting({
      ref: `A2:I${lastPlanRow}`,
      rules: [
        {
          type: "expression",
          priority: 1,
          formulae: [`$F2=0`],
          style: {
            fill: { type: "pattern", pattern: "solid", bgColor: { argb: C.done } },
            font: { color: { argb: C.doneFont } },
          },
        },
      ],
    });
  } else {
    plan.addRow({ day: "Select bosses and enter what you have to generate a plan." });
  }

  // ---------------- Sheet 3: Remote Windows ----------------
  const rw = workbook.addWorksheet("Remote Windows");
  rw.columns = [
    { header: "Boss", key: "boss", width: 22 },
    { header: "Host region", key: "region", width: 26 },
    { header: "Happening there", key: "host", width: 34 },
    { header: "Your local time (peak)", key: "local", width: 34 },
    { header: "Overnight?", key: "overnight", width: 11 },
  ];
  styleHeader(rw.getRow(1));

  const fmt = (utc: number) =>
    new Date(utc).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  for (const input of inputs) {
    if (!input.selected) continue;
    const boss = getBoss(input.bossId);
    if (!boss || bossIsLocal(boss, settings.region)) continue;
    const windows = remoteWindowsForBoss(boss);
    if (!windows) continue;
    for (const w of windows) {
      const startH = new Date(w.anchorStartUtc).getHours();
      const overnight = startH >= 21 || startH < 6;
      const row = rw.addRow({
        boss: boss.name,
        region: w.regionLabel,
        host: w.hostLabel,
        local: `${fmt(w.anchorStartUtc)} – ${fmt(w.anchorEndUtc)} (${w.anchorCity})`,
        overnight: overnight ? "Yes — set an alarm" : "",
      });
      if (overnight) row.getCell(5).font = { bold: true, color: { argb: C.short } };
    }
  }
  if (rw.rowCount === 1) rw.addRow({ boss: "No region-locked targets selected — nothing needs a remote window." });
  rw.views = [{ state: "frozen", ySplit: 1 }];

  // ---------------- Sheet 4: Goals ----------------
  const goals = workbook.addWorksheet("Goals");
  goals.columns = [
    { header: "Boss", key: "boss", width: 24 },
    { header: "Goal", key: "goal", width: 26 },
    { header: "Have Candy", key: "haveCandy", width: 11 },
    { header: "Need Candy", key: "candy", width: 11 },
    { header: "Have XL", key: "haveXl", width: 9 },
    { header: "Need XL", key: "xl", width: 9 },
    { header: "Have Energy", key: "haveEnergy", width: 12 },
    { header: "Need Energy", key: "energy", width: 12 },
    { header: "Raids needed", key: "raids", width: 13 },
    { header: "Limited by", key: "binding", width: 13 },
    { header: "Covered by plan", key: "covered", width: 15 },
    { header: "Short", key: "short", width: 8 },
  ];
  styleHeader(goals.getRow(1));

  // Raids this plan actually does per boss (RoL + weekend + remote).
  const coveredBy = new Map<string, number>();
  for (const d of road.days) for (const s of d.species) coveredBy.set(s.bossId, (coveredBy.get(s.bossId) ?? 0) + s.fitted);
  for (const b of weekend.blocks)
    for (const s of b.species) coveredBy.set(s.bossId, (coveredBy.get(s.bossId) ?? 0) + s.fitted);
  for (const s of weekend.remote?.species ?? []) coveredBy.set(s.bossId, (coveredBy.get(s.bossId) ?? 0) + s.fitted);

  for (const result of summary.results) {
    const boss = getBoss(result.bossId);
    const input = inputById.get(result.bossId);
    if (!boss || !input || result.raids.max <= 0) continue;

    const isMega = boss.tier === "mega" || boss.tier === "super-mega";
    const goalParts: string[] = [];
    if (boss.rewardsCurrencies.includes("xlCandy") && input.target.level > input.current.level) {
      goalParts.push(`Lvl ${input.current.level}→${input.target.level}`);
    }
    if (isMega && input.target.megaLevel > input.current.megaLevel) {
      goalParts.push(`Mega Lvl ${input.current.megaLevel}→${input.target.megaLevel}`);
    }

    const covered = coveredBy.get(result.bossId) ?? 0;
    const short = Math.max(0, sized(result.raids, settings.rewardCase) - covered);
    const row = goals.addRow({
      boss: boss.name,
      goal: goalParts.join(", ") || "—",
      haveCandy: input.current.candy,
      candy: result.needs.candy?.needed ?? 0,
      haveXl: input.current.xlCandy,
      xl: result.needs.xlCandy?.needed ?? 0,
      haveEnergy: input.current.megaEnergy,
      energy: result.needs.megaEnergy?.needed ?? 0,
      raids: formatRange(result.raids),
      binding: result.bindingCurrency ? CURRENCY_LABEL[result.bindingCurrency] : "—",
      covered,
      short: short > 0 ? short : "",
    });
    if (short > 0) row.getCell(12).font = { bold: true, color: { argb: C.short } };
  }
  goals.views = [{ state: "frozen", ySplit: 1 }];
  goals.autoFilter = "A1:L1";

  // ---------------- Sheet 5: Cost ----------------
  const costSheet = workbook.addWorksheet("Cost");
  costSheet.columns = [
    { header: "Line", key: "line", width: 42 },
    { header: "Value", key: "value", width: 28 },
  ];
  styleHeader(costSheet.getRow(1));
  const costRows: [string, string | number][] = [
    ["Committed in-person raids", cost.inPersonRaids],
    ["Free daily passes used", `${cost.freePassesUsed} of ${cost.freePasses} (9/day weekend + RoL weekdays)`],
    ["Owned passes used", `${cost.ownedPassesUsed} of ${cost.ownedInPersonPasses}`],
    ["Green passes to buy", cost.paidInPerson],
    ["Remote passes to buy (3-packs + singles)", cost.totalRemote],
    ["Link Charges needed beyond owned", cost.linkChargesNeeded],
    ["Owned Link Charges used", cost.linkChargesUsed],
    ["Coins — best case", cost.low.total],
    ["Coins — worst case", cost.high.total],
  ];
  for (const [line, value] of costRows) costSheet.addRow({ line, value });
  costSheet.getColumn(1).font = { bold: false };

  // ---------------- Sheet 6: Assumptions ----------------
  const asum = workbook.addWorksheet("Assumptions");
  asum.columns = [
    { header: "Assumption", key: "label", width: 34 },
    { header: "Value", key: "value", width: 44 },
    { header: "Confidence", key: "confidence", width: 15 },
    { header: "Note", key: "note", width: 70 },
  ];
  styleHeader(asum.getRow(1));
  const c = summary.capacity;
  asum.addRow({
    label: "Planning luck case",
    value: REWARD_CASE_LABEL[settings.rewardCase],
    confidence: "—",
    note: "Set on the plan's Results step.",
  });
  asum.addRow({
    label: "Raids per hour",
    value: formatRange(c.raidsPerHour),
    confidence: "—",
    note: `${c.lobbySize}-trainer lobby · ${c.battleSecRange.min}–${c.battleSecRange.max}s battle + ${c.catchSec}s catch + ${c.downtimeSecRange.min}–${c.downtimeSecRange.max}s downtime.`,
  });
  asum.addRow({
    label: "Max weekend raids",
    value: formatRange(c.totalRaids),
    confidence: "—",
    note: `${c.hoursPerDay} h/day × ${c.days} days.`,
  });
  for (const note of ESTIMATE_NOTES) {
    asum.addRow({
      label: note.label,
      value: note.value,
      confidence: CONFIDENCE_META[note.confidence].label,
      note: note.note,
    });
  }
  asum.views = [{ state: "frozen", ySplit: 1 }];
}
