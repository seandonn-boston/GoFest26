"use client";

import type { PlanSummary } from "@/domain/types";
import type { WeekendBlockPlan } from "@/domain";
import { formatRange } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { CapacityGauge } from "./CapacityGauge";
import { PriorityRanker } from "./PriorityRanker";
import { RemoteRaidToggle } from "./RemoteRaidToggle";
import { BlockAccordion } from "./BlockAccordion";

export function SummaryDashboard({ summary, blockPlan }: { summary: PlanSummary; blockPlan: WeekendBlockPlan }) {
  const { capacity, remotePool } = summary;
  const hasGoals = summary.totalRaids.max > 0;
  // Max raids the gauge measures against = in-person weekend capacity + the
  // opted-in remote-pass pool, so the headline number matches the bar.
  const maxRaids = remotePool > 0
    ? { min: capacity.totalRaids.min + remotePool, max: capacity.totalRaids.max + remotePool }
    : capacity.totalRaids;

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-lg font-semibold">Weekend plan</h2>

      <div className="mb-4 grid grid-cols-3 gap-4">
        <Stat label="Total raids needed" value={formatRange(summary.totalRaids)} accent="text-gofest-accent2" />
        <Stat label="Raids / hour" value={formatRange(capacity.raidsPerHour)} />
        <Stat
          label="Max raids"
          value={formatRange(maxRaids)}
          sub={remotePool > 0 ? `incl. ${remotePool} remote` : undefined}
        />
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
          <RemoteRaidToggle />
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
        {remotePool > 0 ? ` Plus ${remotePool} remote raid passes.` : ""}
      </p>
    </Card>
  );
}

function Stat({ label, value, accent = "text-slate-100", sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-xl font-bold ${accent}`}>{value}</div>
      {sub ? <div className="text-[10px] text-gofest-accent">{sub}</div> : null}
    </div>
  );
}
