"use client";

import type { PlanSummary } from "@/domain/types";
import type { RoadPlan, WeekendBlockPlan } from "@/domain";
import { EstimateConfidence } from "@/components/ui/EstimateConfidence";
import { Disclosure } from "@/components/ui/Disclosure";
import { ExportGroup } from "@/components/ExportGroup";
import { GoalProgress } from "./GoalProgress";
import { ResultsPassHighlights } from "./ResultsPassHighlights";
import { AdventureEffects } from "./AdventureEffects";

/**
 * Step 6 — Results. Pulls together everything between the priority screens and
 * the Cost step: the pass headline (held vs. committed), the "raids you can do
 * toward your goals" (RYCDTYG) list, the estimate-confidence ledger, and the
 * three equally-weighted ways to take the plan with you (Excel / share link /
 * JSON backup).
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
          What your plan comes to — the passes it takes, the raids you can finish toward each goal, and how to save it.
        </p>
      </div>

      {hasGoals ? (
        <>
          <ResultsPassHighlights summary={summary} blockPlan={blockPlan} roadPlan={roadPlan} />

          {/* Raids You Can Do Toward Your Goals */}
          <GoalProgress plan={blockPlan} results={summary.results} headStart={roadPlan.headStart} />

          {/* How accurate are these numbers? — with the capacity breakdown at its top. */}
          <EstimateConfidence capacity={summary.capacity} remotePool={summary.remotePool} />

          <ExportGroup summary={summary} />
        </>
      ) : (
        <p className="text-sm text-slate-400">
          Pick targets and enter what you hold on the earlier steps to see your results.
        </p>
      )}

      {/* Adventure Effects candy/dust planner — standalone, useful with or without
          a raid goal, so it sits outside the goals gate. */}
      <Disclosure
        title={<span className="font-semibold text-slate-200">⚡ Adventure Effects planner</span>}
        hint={<span className="text-[12px] text-slate-500">candy &amp; dust to run an effect</span>}
      >
        <AdventureEffects />
      </Disclosure>
    </section>
  );
}
