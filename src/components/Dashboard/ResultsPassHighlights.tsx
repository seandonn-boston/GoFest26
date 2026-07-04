"use client";

import { useMemo } from "react";
import type { PlanSummary } from "@/domain/types";
import type { RoadPlan, WeekendBlockPlan } from "@/domain";
import { computeCommitment, commitmentByBoss, computePassCost } from "@/domain";
import { usePassCoverage } from "@/hooks/usePlannerResults";
import { usePlannerStore } from "@/store/usePlannerStore";
import { formatRange } from "@/lib/format";

/** One headline figure with a caption. */
function Figure({ value, label, accent = "text-slate-100" }: { value: string; label: string; accent?: string }) {
  return (
    <div>
      <div className={`text-2xl font-extrabold leading-none ${accent}`}>{value}</div>
      <div className="mt-1 text-[12px] uppercase tracking-wide text-slate-400">{label}</div>
    </div>
  );
}

/**
 * Results-step pass headline: how many passes you hold vs. how many your
 * COMMITTED plan needs (the raids that actually fit their windows), split into
 * in-person ("green") and remote passes. Remote passes are always bought — a
 * trainer holds at most three. An aside shows the passes a full 100%-of-goals
 * run would take, for the goals that never fit. The PokéCoin bill lives on the
 * Cost step.
 */
export function ResultsPassHighlights({
  summary,
  blockPlan,
  roadPlan,
}: {
  summary: PlanSummary;
  blockPlan: WeekendBlockPlan;
  roadPlan: RoadPlan;
}) {
  const owned = usePlannerStore((s) => Math.max(0, Math.round(s.settings.passesOwned)));
  const inputs = usePlannerStore((s) => s.inputs);
  const settings = usePlannerStore((s) => s.settings);
  const remoteAllocations = usePlannerStore((s) => s.remoteAllocations);
  const playDays = usePlannerStore((s) => s.playDays);
  const cov = usePassCoverage(summary);
  const commitment = useMemo(() => computeCommitment(blockPlan, roadPlan), [blockPlan, roadPlan]);
  // The SAME committed-pass math the Cost step runs (owned + free daily passes
  // spent first), so the "to buy" number here always matches the Cost step —
  // they once disagreed (23 vs 0) because this card ignored the free dailies.
  const committed = useMemo(() => commitmentByBoss(blockPlan, roadPlan), [blockPlan, roadPlan]);
  const cost = useMemo(
    () => computePassCost(Object.values(inputs), summary.results, settings, remoteAllocations, playDays, committed),
    [inputs, summary.results, settings, remoteAllocations, playDays, committed],
  );

  if (summary.totalRaids.max <= 0) return null;

  const greenNeeded = commitment.inPerson;
  const greenToBuy = cost.paidInPerson;
  const remote = cost.totalRemote;
  const covered = greenToBuy <= 0;
  // Passes a full 100% run would take beyond the committed plan.
  const hundredExtra = Math.max(0, cov.needed.max - commitment.total);

  return (
    <section className="rounded-lg border border-white/10 bg-gofest-bg/40 p-3">
      <h3 className="mb-1 text-sm font-semibold text-slate-200">Raid passes</h3>
      <p className="mb-3 text-[12px] text-slate-500">
        For the raids your plan actually commits to — everything that fits its time windows this week.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <Figure
          value={`${owned} / ${greenNeeded}`}
          label="Passes held vs. in-person raids"
          accent={covered ? "text-emerald-300" : "text-gofest-accent2"}
        />
        <Figure
          value={remote > 0 ? String(remote) : "0"}
          label="Remote passes (always bought)"
          accent={remote > 0 ? "text-sky-300" : "text-slate-500"}
        />
      </div>

      <div className="mt-3 rounded-md border border-white/10 bg-gofest-bg/40 px-2.5 py-2 text-[13px]">
        {covered ? (
          cost.ownedPassesUsed + cost.freePassesUsed > 0 ? (
            <p className="text-emerald-300">
              ✓ Your {cost.ownedPassesUsed > 0 ? `${cost.ownedPassesUsed} owned` : ""}
              {cost.ownedPassesUsed > 0 && cost.freePassesUsed > 0 ? " and " : ""}
              {cost.freePassesUsed > 0 ? `${cost.freePassesUsed} free daily` : ""} pass
              {cost.ownedPassesUsed + cost.freePassesUsed === 1 ? "" : "es"} cover every in-person raid you&apos;ve committed
              to{owned > cost.ownedPassesUsed ? ` · ${owned - cost.ownedPassesUsed} spare` : ""}.
            </p>
          ) : (
            <p className="text-emerald-300">✓ No in-person passes needed for this plan.</p>
          )
        ) : (
          <p className="text-slate-300">
            After your <b>{cost.ownedPassesUsed}</b> owned and <b>{cost.freePassesUsed}</b> free daily passes, you&apos;d buy{" "}
            <b className="text-amber-300">{greenToBuy}</b> in-person (green) pass{greenToBuy === 1 ? "" : "es"}
            {remote > 0 ? (
              <>
                {" "}
                and <b className="text-sky-300">{remote}</b> remote pass{remote === 1 ? "" : "es"}
              </>
            ) : null}{" "}
            to do everything you&apos;ve committed to.
          </p>
        )}
      </div>

      {hundredExtra > 0 ? (
        <p className="mt-2 text-[12px] text-slate-500">
          To reach <b className="text-slate-300">100%</b> of your goals you&apos;d need about{" "}
          <b className="text-slate-300">{hundredExtra}</b> more raid pass{hundredExtra === 1 ? "" : "es"}
          {" beyond the committed plan (goals that don’t fit their windows — see the Cost step)."}
        </p>
      ) : (
        <p className="mt-2 text-[12px] text-emerald-300/80">
          Your committed plan already covers 100% of your goals — total needed {formatRange(cov.needed)}.
        </p>
      )}
    </section>
  );
}
