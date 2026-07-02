"use client";

import { STEP_COUNT, type StepId } from "@/store/useUiStore";

/**
 * Back / Next pair shown at the foot of each step. Navigation is never forced —
 * the step pills above let you jump anywhere — but these give a low-effort path
 * through the flow, which reads better on a phone than reaching for the pills.
 */
export function StepFooter({
  step,
  onPrev,
  onNext,
  nextLabel,
}: {
  step: StepId;
  onPrev: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  const isFirst = step <= 1;
  const isLast = step >= STEP_COUNT;
  return (
    <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
      <button
        type="button"
        onClick={onPrev}
        disabled={isFirst}
        className={`rounded-md border px-3 py-1.5 text-sm transition ${
          isFirst ? "cursor-not-allowed border-white/10 text-slate-600" : "border-white/20 text-slate-200 hover:bg-white/5"
        }`}
      >
        ← Back
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={isLast}
        className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${
          isLast
            ? "cursor-not-allowed bg-white/10 text-slate-500"
            : "bg-gofest-accent2 text-black shadow-brutal hover:brightness-110"
        }`}
      >
        {nextLabel ?? "Next"} →
      </button>
    </div>
  );
}
