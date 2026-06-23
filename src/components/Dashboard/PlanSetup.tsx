"use client";

import type { CapacityModel } from "@/domain/types";
import type { RoadPlan } from "@/domain";
import { Card } from "@/components/ui/Card";
import { PriorityList } from "./PriorityList";
import { RoadOfLegends } from "./RoadOfLegends";
import { RemoteRaidToggle } from "./RemoteRaidToggle";

/**
 * Step 4 — everything that shapes the plan before you see the numbers: rank your
 * targets, pick the Road of Legends weekday evenings you'll raid, and opt into
 * remote raids. These all feed the results on the next step (and priority can
 * still be tweaked per-block there).
 */
export function PlanSetup({ roadPlan, capacity }: { roadPlan: RoadPlan; capacity: CapacityModel }) {
  return (
    <Card className="p-4">
      <h2 className="mb-1 text-lg font-semibold">Set your priorities</h2>
      <p className="mb-3 text-sm text-slate-400">
        Rank what matters most, choose any weekday head-start days, and decide whether you&apos;ll do
        remote raids. You can change all of this later without losing your place.
      </p>

      <PriorityList />
      <RoadOfLegends road={roadPlan} />
      <RemoteRaidToggle capacity={capacity} />
    </Card>
  );
}
