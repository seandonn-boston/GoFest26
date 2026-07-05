import { buildWorkbook, type WorkbookContext } from "./buildWorkbook";
import { addBackupSheet } from "./backupFile";

/**
 * Generates the raid-plan .xlsx in the browser and triggers a download.
 * ExcelJS is imported dynamically so it only loads when the user exports.
 */
export async function exportPlanToXlsx(ctx: WorkbookContext): Promise<void> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  buildWorkbook(workbook, ctx);
  addBackupSheet(workbook); // hidden restore payload so the export round-trips

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
