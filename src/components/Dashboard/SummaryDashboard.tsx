"use client";

import type { PlanSummary } from "@/domain/types";
import type { WeekendBlockPlan } from "@/domain";
import { formatRange } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { CapacityGauge } from "./CapacityGauge";
import { PriorityRanker } from "./PriorityRanker";
import { BlockAccordion } from "./BlockAccordion";

export function SummaryDashboard({ summary, blockPlan }: { summary: PlanSummary; blockPlan: WeekendBlockPlan }) {
  const { capacity } = summary;
  const hasGoals = summary.totalRaids.max > 0;

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-lg font-semibold">Weekend plan</h2>

      <div className="mb-4 grid grid-cols-3 gap-4">
        <Stat label="Total raids needed" value={formatRange(summary.totalRaids)} accent="text-gofest-accent2" />
        <Stat label="Raids / hour" value={formatRange(capacity.raidsPerHour)} />
        <Stat label="Max weekend raids" value={formatRange(capacity.totalRaids)} />
      </div>

      {hasGoals ? (
        <>
          <CapacityGauge utilization={summary.utilization} />
          {(() => {
            const windowLimited = summary.schedule.unmetGoals.length > 0;
            const ok = summary.feasible && !windowLimited;
            return (
              <p className={`mt-3 text-sm ${ok ? "text-emerald-300" : "text-rose-300"}`}>
                {ok
                  ? "✓ Your goals fit within the weekend — and inside each boss's time windows."
                  : windowLimited
                    ? `⚠ Some goals can't fit their limited time windows: ${summary.schedule.unmetGoals
                        .map((u) => u.bossName)
                        .join(", ")}. Each non-Mewtwo boss only spawns for one 3-hour habitat block.`
                    : "⚠ Your goals exceed the max raids possible this weekend. Trim targets, use the mega-buddy boost, or prioritize."}
              </p>
            );
          })()}

          <PriorityRanker />
          <BlockAccordion plan={blockPlan} />
        </>
      ) : (
        <p className="text-sm text-slate-400">
          Select bosses and enter what you currently hold to see how many raids you need.
        </p>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Capacity assumes {capacity.hoursPerDay}h/day × {capacity.days} days, a {capacity.lobbySize}-trainer
        lobby (~{capacity.battleSecRange.min}–{capacity.battleSecRange.max}s battle by tier) + {capacity.catchSec}s
        catch per raid plus {capacity.downtimeSecRange.min}–{capacity.downtimeSecRange.max}s between raids.
      </p>
    </Card>
  );
}

function Stat({ label, value, accent = "text-slate-100" }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}
