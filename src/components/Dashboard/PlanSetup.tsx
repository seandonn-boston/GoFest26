"use client";

import type { RoadPlan } from "@/domain";
import { RoadOfLegends } from "./RoadOfLegends";

/**
 * Step 3 — the OPTIONAL add-ons that refine the plan: the Road of Legends weekday
 * evenings you'll raid, whether you'll do remote raids, and the passes / remote
 * passes / Link Charges you already hold. All optional — skip any of it. Target
 * priority is no longer set here; it's set by ordering each time block on the
 * Results step.
 */
export function PlanSetup({ roadPlan }: { roadPlan: RoadPlan }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="mb-1 text-lg font-semibold">Road of Legends</h2>
        <p className="text-sm text-slate-400">
          The weekday raid hours (Mon Jul 6 – Fri Jul 10) before the event. Pick the evenings you&apos;ll raid and which
          targets to pre-farm each day — whatever you knock out here is a head start that shrinks your GO Fest weekend.
        </p>
      </div>

      <RoadOfLegends road={roadPlan} />
    </section>
  );
}
