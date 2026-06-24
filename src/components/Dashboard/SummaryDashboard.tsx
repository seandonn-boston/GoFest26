"use client";

import { useMemo } from "react";
import type { PlanSummary, Range } from "@/domain/types";
import type { RoadPlan, WeekendBlockPlan } from "@/domain";
import type { PlannerSettings } from "@/domain/settings";
import { midpoint } from "@/lib/math";
import { useRemoteAutoBalance } from "@/hooks/usePlannerResults";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Card } from "@/components/ui/Card";
import { Disclosure } from "@/components/ui/Disclosure";
import { CapacityGauge } from "./CapacityGauge";
import { PlanPasses } from "./PlanPasses";
import { RareCandyPanel } from "./RareCandyPanel";
import { PassCoverageBar } from "./PassCoverage";
import { BlockAccordion } from "./BlockAccordion";
import { PassEconomy } from "./PassEconomy";

type RewardCase = PlannerSettings["rewardCase"];

const REWARD_CASES: { id: RewardCase; label: string }[] = [
  { id: "optimistic", label: "Best case" },
  { id: "expected", label: "Expected" },
  { id: "safe", label: "Worst case" },
];

/** Single value for a range under the chosen case. `favorHigh` flips which end
 *  is "best": fewer raids needed is good (low), more raids/hour is good (high). */
function caseValue(range: Range, rc: RewardCase, favorHigh: boolean): number {
  if (rc === "expected") return Math.round(midpoint(range));
  const best = favorHigh ? range.max : range.min;
  const worst = favorHigh ? range.min : range.max;
  return rc === "optimistic" ? best : worst;
}

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
  const rewardCase = usePlannerStore((s) => s.settings.rewardCase);
  const setSettings = usePlannerStore((s) => s.setSettings);
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
      <h2 className="mb-3 text-lg font-semibold">Your weekend plan</h2>

      {/* Passes you already hold — sit between the title and the headline numbers
          so the have/need/buy split below reflects them (free daily passes are
          auto-counted). Moved here from the prioritize step. */}
      <PlanPasses />

      <div className="mb-3 grid grid-cols-3 gap-4">
        <Stat label="Total raids needed" value={String(caseValue(summary.totalRaids, rewardCase, false))} accent="text-gofest-accent2" />
        <Stat label="Raids / hour" value={String(caseValue(capacity.raidsPerHour, rewardCase, true))} />
        <Stat
          label="Max raids"
          value={String(caseValue(maxRaids, rewardCase, true))}
          sub={remotePool > 0 ? `incl. ${remotePool} remote` : undefined}
        />
      </div>

      {/* Reward-luck case selector — drives the single numbers above and on every
          priority tile (best = luckiest drops → fewest raids). */}
      <div className="mb-4 inline-flex rounded-lg border border-white/10 bg-gofest-bg/40 p-0.5">
        {REWARD_CASES.map((rc) => (
          <button
            key={rc.id}
            type="button"
            onClick={() => setSettings({ rewardCase: rc.id })}
            aria-pressed={rewardCase === rc.id}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              rewardCase === rc.id ? "bg-gofest-accent2 text-black" : "text-slate-300 hover:text-white"
            }`}
          >
            {rc.label}
          </button>
        ))}
      </div>

      {hasGoals ? (
        <>
          <RareCandyPanel plan={blockPlan} />
          <CapacityGauge utilization={summary.utilization} />
          <PassCoverageBar summary={summary} />
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

          <BlockAccordion plan={blockPlan} results={summary.results} headStart={roadPlan.headStart} />
          <PassEconomy summary={summary} />
        </>
      ) : (
        <p className="text-sm text-slate-400">
          Select bosses and enter what you currently hold to see how many raids you need.
        </p>
      )}

      <div className="mt-3">
        <Disclosure title="How capacity is calculated">
          <p className="text-[11px] leading-snug text-slate-500">
            Capacity assumes {capacity.hoursPerDay}h/day × {capacity.days} days, a {capacity.lobbySize}-trainer
            lobby (~{capacity.battleSecRange.min}–{capacity.battleSecRange.max}s battle by tier) + {capacity.catchSec}s
            catch per raid plus {capacity.downtimeSecRange.min}–{capacity.downtimeSecRange.max}s between raids.
            {remotePool > 0 ? ` Plus ${remotePool} remote raid passes.` : ""}
          </p>
        </Disclosure>
      </div>
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
