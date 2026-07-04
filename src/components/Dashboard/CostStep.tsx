"use client";

import type { PlanSummary } from "@/domain/types";
import type { RoadPlan, WeekendBlockPlan } from "@/domain";
import { CommittedCost } from "./CommittedCost";

/**
 * Step 7 — Cost. The money side, focused on the raids you've actually COMMITTED
 * to (what fits your time windows), not a full 100%-of-goals run. Remote passes
 * are always bought; owned + free daily passes cover the in-person raids first.
 * A collapsed section adds the extra cost — and days of free dailies — to chase
 * 100%.
 */
export function CostStep({
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
    <section>
      <h2 className="mb-1 text-lg font-semibold">What it&apos;ll cost</h2>
      <p className="mb-3 text-sm text-slate-400">
        Just the raids you&apos;ve committed to this week — the ones that fit their time windows. Passes you already hold and
        your free daily passes come off first; only the rest is a bill.
      </p>

      {hasGoals ? (
        <CommittedCost summary={summary} blockPlan={blockPlan} roadPlan={roadPlan} />
      ) : (
        <p className="text-sm text-slate-400">
          Pick targets and enter what you hold on the earlier steps to see the pass cost.
        </p>
      )}
    </section>
  );
}
