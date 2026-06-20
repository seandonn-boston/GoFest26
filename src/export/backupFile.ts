import type { Workbook } from "exceljs";
import { serializeState, isStateBackup, type StateBackup } from "@/store/stateBackup";

/** Name of the (hidden) sheet that carries the machine-readable restore payload. */
export const BACKUP_SHEET = "Backup";

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---- JSON (the upload-optimized format: tiny, instant, no spreadsheet engine) ----

/** Download the full plan as a compact .json backup. */
export function downloadJsonBackup(): void {
  const data = JSON.stringify(serializeState(), null, 2);
  triggerDownload(new Blob([data], { type: "application/json" }), "gofest2026-raid-planner-backup.json");
}

/** Parse + validate a .json backup file. */
export async function readJsonBackup(file: File): Promise<StateBackup> {
  let obj: unknown;
  try {
    obj = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!isStateBackup(obj)) throw new Error("That JSON isn't a Raid Planner backup.");
  return obj;
}

// ---- Excel (re-import the exported .xlsx) ----

/** Embed the restore payload as a hidden sheet so the exported .xlsx round-trips. */
export function addBackupSheet(workbook: Workbook): void {
  const sheet = workbook.addWorksheet(BACKUP_SHEET, { state: "hidden" });
  sheet.getCell("A1").value =
    "GO Fest 2026 Raid Planner — machine-readable backup. Re-import this .xlsx to restore your plan. Do not edit this sheet.";
  sheet.getCell("A2").value = JSON.stringify(serializeState());
}

/** Read the restore payload out of an exported .xlsx. */
export async function readXlsxBackup(file: File): Promise<StateBackup> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new Error("Couldn't read that .xlsx file.");
  }
  const cell = wb.getWorksheet(BACKUP_SHEET)?.getCell("A2").value;
  if (typeof cell !== "string") {
    throw new Error("That .xlsx isn't a Raid Planner export (no backup data). Export a fresh plan first.");
  }
  let obj: unknown;
  try {
    obj = JSON.parse(cell);
  } catch {
    throw new Error("The backup data in that .xlsx is corrupted.");
  }
  if (!isStateBackup(obj)) throw new Error("That .xlsx isn't a Raid Planner backup.");
  return obj;
}
