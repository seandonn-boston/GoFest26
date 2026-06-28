"use client";

import { useMemo } from "react";
import type { PlanSummary, Range } from "@/domain/types";
import type { RoadPlan, WeekendBlockPlan } from "@/domain";
import type { PlannerSettings } from "@/domain/settings";
import { midpoint } from "@/lib/math";
import { useRemoteAutoBalance } from "@/hooks/usePlannerResults";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Disclosure } from "@/components/ui/Disclosure";
import { MathTooltip } from "@/components/ui/MathTooltip";
import { CapacityGauge } from "./CapacityGauge";
import { BlockAccordion } from "./BlockAccordion";

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
    <section>
      <h2 className="mb-3 text-lg font-semibold">Your weekend plan</h2>

      <div className="mb-3 grid grid-cols-3 gap-4">
        <Stat label="Total raids needed" value={String(caseValue(summary.totalRaids, rewardCase, false))} accent="text-gofest-accent2" />
        <Stat label="Raids / hour" value={String(caseValue(capacity.raidsPerHour, rewardCase, true))} />
        <Stat
          label="Max raids"
          value={String(caseValue(maxRaids, rewardCase, true))}
          sub={remotePool > 0 ? `incl. ${remotePool} remote` : undefined}
        />
      </div>

      {/* Reward-luck case selector — centered; drives the single numbers above and
          on every priority tile (best = luckiest drops → fewest raids). */}
      <div className="mb-4 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-400">
          <span>Plan for which reward luck?</span>
          <MathTooltip
            label="How reward luck works"
            hideIcon
            trigger={
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/25 text-[11px] font-bold leading-none text-slate-400 transition hover:border-white/50 hover:text-slate-200">
                i
              </span>
            }
          >
            <div className="space-y-1.5 text-[13px] leading-relaxed text-slate-300">
              <p>
                Every raid&apos;s Candy / XL / Mega Energy drop is a range, so the raids you need are a range
                too. This picks which end of that range <b>every number on this page</b> assumes:
              </p>
              <p>
                <b className="text-emerald-300">Best case</b> — luckiest drops, so the <b>fewest</b> raids.
              </p>
              <p>
                <b className="text-amber-300">Expected</b> — the middle, a realistic average.
              </p>
              <p>
                <b className="text-rose-300">Worst case</b> — coldest drops, so the <b>most</b> raids (won&apos;t
                leave you short).
              </p>
              <p className="text-slate-400">
                It sets the totals above and the <span className="font-mono">done / needed</span> target on every
                priority tile below.
              </p>
            </div>
          </MathTooltip>
        </div>
        <div className="inline-flex rounded-lg border border-white/10 bg-gofest-bg/40 p-0.5">
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
      </div>

      {hasGoals ? (
        <>
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

          {/* Weekend capacity-used bar — below all the time blocks. */}
          <CapacityGauge utilization={summary.utilization} />
        </>
      ) : (
        <p className="text-sm text-slate-400">
          Select bosses and enter what you currently hold to see how many raids you need.
        </p>
      )}

      <div className="mt-3">
        <Disclosure title="How capacity is calculated">
          <p className="text-[13px] leading-snug text-slate-500">
            Capacity assumes {capacity.hoursPerDay}h/day × {capacity.days} days, a {capacity.lobbySize}-trainer
            lobby (~{capacity.battleSecRange.min}–{capacity.battleSecRange.max}s battle by tier) + {capacity.catchSec}s
            catch per raid, plus a {capacity.lobbySec}s lobby wait, {capacity.transitionSecRange.min}–
            {capacity.transitionSecRange.max}s of transitions, and {capacity.downtimeSecRange.min}–
            {capacity.downtimeSecRange.max}s between raids.
            {remotePool > 0 ? ` Plus ${remotePool} remote raid passes.` : ""}
          </p>
        </Disclosure>
      </div>
    </section>
  );
}

function Stat({ label, value, accent = "text-slate-100", sub }: { label: string; value: string; accent?: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-xl font-bold ${accent}`}>{value}</div>
      {sub ? <div className="text-[12px] text-gofest-accent">{sub}</div> : null}
    </div>
  );
}
