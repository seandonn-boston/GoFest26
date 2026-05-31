"use client";

import type { PlanSummary } from "@/domain/types";
import { formatRange } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { CapacityGauge } from "./CapacityGauge";

export function SummaryDashboard({ summary }: { summary: PlanSummary }) {
  const { capacity } = summary;
  const hasGoals = summary.totalRaidsNoBoost.max > 0;

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-lg font-semibold">Weekend plan</h2>

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total raids needed" value={formatRange(summary.totalRaidsNoBoost)} accent="text-gofest-accent2" />
        <Stat label="With mega buddy" value={formatRange(summary.totalRaidsWithBoost)} accent="text-gofest-mewtwo" />
        <Stat label="Raids / hour" value={formatRange(capacity.raidsPerHour)} />
        <Stat label="Max weekend raids" value={formatRange(capacity.totalRaids)} />
      </div>

      {hasGoals ? (
        <>
          <CapacityGauge utilization={summary.utilizationNoBoost} />
          <p className={`mt-3 text-sm ${summary.feasible ? "text-emerald-300" : "text-rose-300"}`}>
            {summary.feasible
              ? "✓ Your goals fit within the weekend — even in the worst-case reward rolls."
              : "⚠ Your goals exceed the max raids possible this weekend. Trim targets, use the mega-buddy boost, or prioritize."}
          </p>
        </>
      ) : (
        <p className="text-sm text-slate-400">
          Select bosses and enter what you currently hold to see how many raids you need.
        </p>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Capacity assumes {capacity.hoursPerDay}h/day × {capacity.days} days, ~{capacity.raidDurationSec}s per
        raid plus {capacity.downtimeSecRange.min}–{capacity.downtimeSecRange.max}s between raids.
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
