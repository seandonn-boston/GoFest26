"use client";

import type { PlanSummary } from "@/domain/types";
import type { RoadPlan, WeekendBlockPlan } from "@/domain";
import { EstimateConfidence } from "@/components/ui/EstimateConfidence";
import { ExportGroup } from "@/components/ExportGroup";
import { GoalProgress } from "./GoalProgress";
import { ResultsPassHighlights } from "./ResultsPassHighlights";
import { WeekTracker } from "./WeekTracker";

/**
 * Step 6 — Results. Pulls together everything between the priority screens and
 * the Cost step: the pass headline (held vs. committed), the full week tracker
 * (the plan line by line — and the ONE place completed raids are logged), the
 * "raids you can do toward your goals" (RYCDTYG) list, the estimate-confidence
 * ledger, and the three equally-weighted ways to take the plan with you
 * (Excel / share link / JSON backup).
 */
export function ResultsStep({
  summary,
  blockPlan,
  roadPlan,
}: {
  summary: PlanSummary;
  blockPlan: WeekendBlockPlan;
  roadPlan: RoadPlan;
}) {
  const hasGoals = summary.totalRaids.max > 0;

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Results</h2>
        <p className="mt-1 text-sm text-slate-400">
          What your plan comes to — the passes it takes, your whole week line by line (log raids here as you finish them),
          the goals you can reach, and how to save it.
        </p>
      </div>

      {hasGoals ? (
        <>
          <ResultsPassHighlights summary={summary} blockPlan={blockPlan} roadPlan={roadPlan} />

          {/* The whole week, line by line — and where completed raids are logged. */}
          <WeekTracker blockPlan={blockPlan} roadPlan={roadPlan} />

          {/* Raids You Can Do Toward Your Goals */}
          <GoalProgress plan={blockPlan} results={summary.results} headStart={roadPlan.headStart} />

          {/* How accurate are these numbers? — with the capacity breakdown at its top. */}
          <EstimateConfidence capacity={summary.capacity} remotePool={summary.remotePool} />

          <ExportGroup summary={summary} blockPlan={blockPlan} roadPlan={roadPlan} />
        </>
      ) : (
        <p className="text-sm text-slate-400">
          Pick targets and enter what you hold on the earlier steps to see your results.
        </p>
      )}
    </section>
  );
}
