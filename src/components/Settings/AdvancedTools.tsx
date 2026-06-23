"use client";

import { Disclosure } from "@/components/ui/Disclosure";
import { BackupControls } from "./BackupControls";
import { CalibrationPanel } from "@/components/ui/CalibrationPanel";
import { EstimateConfidence } from "@/components/ui/EstimateConfidence";

/**
 * The results-page housekeeping — backup/restore, luck calibration, and the
 * estimate-confidence ledger — tucked behind one collapsed "Advanced" panel so
 * the results step leads with the raid counts, not the maintenance tools. Each
 * inner tool stays independently expandable once Advanced is open.
 */
export function AdvancedTools() {
  return (
    <Disclosure
      title={<span className="font-semibold text-slate-200">Advanced</span>}
      hint={<span className="text-[10px] text-slate-500">backup · calibration · sources</span>}
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-slate-200">Backup &amp; restore</h3>
          <BackupControls />
        </div>
        <CalibrationPanel />
        <EstimateConfidence />
      </div>
    </Disclosure>
  );
}
