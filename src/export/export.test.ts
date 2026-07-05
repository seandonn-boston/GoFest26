import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { getBoss } from "@/data";
import { makeDefaultInput } from "@/domain/defaults";
import { computePlanSummary, computeRoadPlan, computeBlockPlan } from "@/domain";
import { DEFAULT_SETTINGS } from "@/domain/settings";
import type { BossInput } from "@/domain/types";
import { buildWorkbook, type WorkbookContext } from "./buildWorkbook";

function selected(bossId: string, overrides: Partial<BossInput["current"]> = {}): BossInput {
  const base = makeDefaultInput(getBoss(bossId)!);
  return { ...base, current: { ...base.current, ...overrides } };
}

/** Build a full context the way the app does: summary → road → weekend. */
function makeContext(inputs: BossInput[], playDays: Record<string, boolean> = {}): WorkbookContext {
  const settings = DEFAULT_SETTINGS;
  const remoteAllocations = {};
  const summary = computePlanSummary(inputs, settings, remoteAllocations);
  const road = computeRoadPlan(
    inputs,
    summary.results,
    summary.capacity,
    settings,
    playDays,
    {},
    remoteAllocations,
    {},
    {},
    true,
    {},
    {},
  );
  const weekend = computeBlockPlan(
    inputs,
    summary.results,
    summary.capacity,
    settings,
    {},
    remoteAllocations,
    {},
    road.headStart,
    {},
  );
  return { summary, inputs, weekend, road, settings, remoteAllocations, playDays };
}

describe("buildWorkbook", () => {
  it("produces the six plan sheets with a populated Week Plan tracker", async () => {
    // Zekrom is featured Monday's RoL marathon AND a weekend block, so with
    // Monday toggled on the Week Plan gets both weekday and weekend rows.
    const ctx = makeContext([selected("mega-mewtwo-x"), selected("zekrom")], { mon: true });

    const workbook = new ExcelJS.Workbook();
    buildWorkbook(workbook, ctx);

    expect(workbook.worksheets.map((w) => w.name)).toEqual([
      "Overview",
      "Week Plan",
      "Remote Windows",
      "Goals",
      "Cost",
      "Assumptions",
    ]);

    const plan = workbook.getWorksheet("Week Plan")!;
    expect(plan.rowCount).toBeGreaterThan(1);
    // Row 2 is a real plan line: a raid target and a Left formula tracking Done.
    const r2 = plan.getRow(2);
    expect(Number(r2.getCell(4).value)).toBeGreaterThan(0);
    expect((r2.getCell(6).value as ExcelJS.CellFormulaValue).formula).toContain("MAX(0,D2-N(E2))");

    // Monday's RoL rows precede the weekend rows (chronological order).
    const firstDay = String(plan.getRow(2).getCell(1).value);
    expect(firstDay).toContain("Monday");

    // Overview totals reference the Week Plan Done column (live tracker).
    const overview = workbook.getWorksheet("Overview")!;
    const formulas: string[] = [];
    overview.eachRow((row) => {
      const v = row.getCell(2).value;
      if (v && typeof v === "object" && "formula" in v) formulas.push(String(v.formula));
    });
    expect(formulas.some((f) => f.includes("'Week Plan'!E2:E"))).toBe(true);

    // Goals rows only for bosses with a real need; both selected bosses qualify.
    const goals = workbook.getWorksheet("Goals")!;
    expect(goals.rowCount).toBeGreaterThan(2);

    const buffer = await workbook.xlsx.writeBuffer();
    // A valid .xlsx is a zip — first two bytes are "PK".
    const bytes = new Uint8Array(buffer);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'
  });

  it("handles an empty plan without crashing (placeholder Week Plan row)", async () => {
    const ctx = makeContext([]);
    const workbook = new ExcelJS.Workbook();
    buildWorkbook(workbook, ctx);
    const plan = workbook.getWorksheet("Week Plan")!;
    expect(String(plan.getRow(2).getCell(1).value)).toContain("Select bosses");
    const buffer = await workbook.xlsx.writeBuffer();
    expect(new Uint8Array(buffer)[0]).toBe(0x50);
  });
});
