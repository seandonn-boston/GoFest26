"use client";

import type { RoadPlan } from "@/domain";
import { RoadOfLegends } from "./RoadOfLegends";
import { RemoteRaidToggle } from "./RemoteRaidToggle";

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
        <h2 className="mb-1 text-lg font-semibold">Optional add-ons</h2>
        <p className="text-sm text-slate-400">
          All optional — pick any weekday head-start days and decide whether you&apos;ll do remote raids.
          Priority is now set by ordering each time block on the Results step.
        </p>
      </div>

      <RoadOfLegends road={roadPlan} />
      <RemoteRaidToggle />
    </section>
  );
}
