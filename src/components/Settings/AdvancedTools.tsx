"use client";

import { Disclosure } from "@/components/ui/Disclosure";
import { CalibrationPanel } from "@/components/ui/CalibrationPanel";
import { EstimateConfidence } from "@/components/ui/EstimateConfidence";

/**
 * The results-page housekeeping — luck calibration and the estimate-confidence
 * ledger — tucked behind one collapsed "Advanced" panel so the results step
 * leads with the raid counts, not the maintenance tools. Backup & restore lives
 * in the FAB speed-dial. Each inner tool stays independently expandable.
 */
export function AdvancedTools() {
  return (
    <Disclosure
      title={<span className="font-semibold text-slate-200">Advanced</span>}
      hint={<span className="text-[10px] text-slate-500">calibration · sources</span>}
    >
      <div className="space-y-3">
        <CalibrationPanel />
        <EstimateConfidence />
      </div>
    </Disclosure>
  );
}
