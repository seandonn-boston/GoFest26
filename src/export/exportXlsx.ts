import type { BossInput, PlanSummary } from "@/domain/types";
import { buildWorkbook } from "./buildWorkbook";

/**
 * Generates the raid-plan .xlsx in the browser and triggers a download.
 * ExcelJS is imported dynamically so it only loads when the user exports.
 */
export async function exportPlanToXlsx(
  summary: PlanSummary,
  inputs: BossInput[],
): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  buildWorkbook(workbook, summary, inputs);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "gofest2026-raid-plan.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
