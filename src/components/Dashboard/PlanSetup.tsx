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
  // The heading + description live inside RoadOfLegends (its own "raid week"
  // header), so this step is just that section — no duplicate title above it.
  return (
    <section>
      <RoadOfLegends road={roadPlan} />
    </section>
  );
}
