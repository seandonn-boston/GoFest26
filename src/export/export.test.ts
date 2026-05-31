import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { getBoss } from "@/data";
import { makeDefaultInput } from "@/domain/defaults";
import { computePlanSummary } from "@/domain";
import type { BossInput } from "@/domain/types";
import { buildWorkbook } from "./buildWorkbook";

function selected(bossId: string, overrides: Partial<BossInput["current"]> = {}): BossInput {
  const base = makeDefaultInput(getBoss(bossId)!);
  return { ...base, current: { ...base.current, ...overrides } };
}

describe("buildWorkbook", () => {
  it("produces a non-empty workbook with Schedule, Goals, and Capacity sheets", async () => {
    const inputs = [selected("mega-mewtwo-x"), selected("reshiram")];
    const summary = computePlanSummary(inputs);

    const workbook = new ExcelJS.Workbook();
    buildWorkbook(workbook, summary, inputs);

    expect(workbook.worksheets.map((w) => w.name)).toEqual(["Schedule", "Goals", "Capacity"]);

    const schedule = workbook.getWorksheet("Schedule")!;
    // Header row + at least one scheduled raid.
    expect(schedule.rowCount).toBeGreaterThan(1);

    const goals = workbook.getWorksheet("Goals")!;
    expect(goals.rowCount).toBe(1 + summary.results.length);

    const buffer = await workbook.xlsx.writeBuffer();
    // A valid .xlsx is a zip — first two bytes are "PK".
    const bytes = new Uint8Array(buffer);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'
  });
});
