"use client";

import { useState } from "react";
import type { PlanSummary } from "@/domain/types";
import { exportPlanToXlsx } from "@/export/exportXlsx";
import { usePlannerStore } from "@/store/usePlannerStore";

export function ExportButton({ summary }: { summary: PlanSummary }) {
  const inputs = usePlannerStore((s) => s.inputs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = busy || summary.schedule.raids.length === 0;

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      await exportPlanToXlsx(summary, Object.values(inputs));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={disabled}
        className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
          disabled
            ? "cursor-not-allowed bg-white/10 text-slate-500"
            : "bg-gofest-accent text-white shadow-lg shadow-gofest-accent/30 hover:bg-gofest-accent/90"
        }`}
      >
        {busy ? "Building…" : "⬇ Export raid plan (.xlsx)"}
      </button>
      {summary.schedule.raids.length === 0 ? (
        <span className="text-xs text-slate-500">Select bosses and enter your currencies first.</span>
      ) : null}
      {error ? <span className="text-xs text-rose-300">{error}</span> : null}
    </div>
  );
}
