"use client";

import { useMemo } from "react";
import type { PlanSummary } from "@/domain/types";
import type { RoadPlan, WeekendBlockPlan } from "@/domain";
import { formatRange } from "@/lib/format";
import { useRemoteAutoBalance } from "@/hooks/usePlannerResults";
import { Card } from "@/components/ui/Card";
import { CapacityGauge } from "./CapacityGauge";
import { RemoteRaidToggle } from "./RemoteRaidToggle";
import { BlockAccordion } from "./BlockAccordion";
import { RoadOfLegends } from "./RoadOfLegends";

export function SummaryDashboard({
  summary,
  blockPlan,
  roadPlan,
}: {
  summary: PlanSummary;
  blockPlan: WeekendBlockPlan;
  roadPlan: RoadPlan;
}) {
  // Re-balance remote passes by priority while in auto mode (no-op once manual).
  useRemoteAutoBalance(summary);
  const { capacity, remotePool } = summary;
  const hasGoals = summary.totalRaids.max > 0;
  // Max raids the gauge measures against = in-person weekend capacity + the
  // opted-in remote-pass pool, so the headline number matches the bar.
  const maxRaids = remotePool > 0
    ? { min: capacity.totalRaids.min + remotePool, max: capacity.totalRaids.max + remotePool }
    : capacity.totalRaids;

  // Which goals still don't fit, derived from the block plan — so the warning
  // tracks the priority order (lowest is cut first) and remote-pass offloading,
  // exactly like the accordion below. A species reappears here only if it has
  // leftover in-person raids in some block after both are applied.
  const cutNames = useMemo(() => {
    const byId = new Map<string, string>();
    for (const block of blockPlan.blocks) {
      for (const s of block.species) {
        if (s.remaining > 0 && !byId.has(s.bossId)) byId.set(s.bossId, s.bossName);
      }
    }
    return [...byId.values()];
  }, [blockPlan]);

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-lg font-semibold">3. Plan your weekend</h2>

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
            const ok = blockPlan.feasible;
            return (
              <p className={`mt-3 text-sm ${ok ? "text-emerald-300" : "text-rose-300"}`}>
                {ok
                  ? "✓ Your goals fit within the weekend — and inside each boss's time windows."
                  : cutNames.length > 0
                    ? `⚠ Some goals can't fit their limited time windows: ${cutNames.join(
                        ", ",
                      )}. Each non-Mewtwo boss only spawns for one 3-hour habitat block — reorder priority or assign remote raids to cover them.`
                    : "⚠ Your goals exceed the max raids possible this weekend. Trim targets, use the mega-buddy boost, or prioritize."}
              </p>
            );
          })()}

          <RemoteRaidToggle capacity={summary.capacity} />
          <RoadOfLegends road={roadPlan} />
          <BlockAccordion plan={blockPlan} results={summary.results} headStart={roadPlan.headStart} />
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
