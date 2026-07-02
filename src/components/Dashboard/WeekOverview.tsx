"use client";

import { useMemo } from "react";
import { ROAD_DAYS } from "@/data/roadOfLegends";
import { goalProgress, type RoadPlan, type WeekendBlockPlan } from "@/domain";
import type { PlanSummary } from "@/domain/types";
import { usePlannerStore } from "@/store/usePlannerStore";
import type { StepId } from "@/store/useUiStore";

interface DayBit {
  key: string;
  label: string;
  date: string;
  /** Raids planned that day (0 = not playing / nothing fits). */
  count: number;
  on: boolean;
  step: StepId;
  title: string;
}

/**
 * The 7-day path — one strip that frames the whole event: each Road of Legends
 * evening, both GO Fest days, the remote pool, and a single goal-progress
 * number. Every chip jumps to the step that edits it, so "choosing your path"
 * is always one tap from seeing it. Rendered on the plan steps (3–6).
 */
export function WeekOverview({
  summary,
  blockPlan,
  roadPlan,
  onJump,
}: {
  summary: PlanSummary;
  blockPlan: WeekendBlockPlan;
  roadPlan: RoadPlan;
  onJump: (step: StepId) => void;
}) {
  const settings = usePlannerStore((s) => s.settings);
  const quickCatchBlocks = usePlannerStore((s) => s.quickCatchBlocks);

  const progress = useMemo(
    () => goalProgress(blockPlan, summary.results, settings, quickCatchBlocks, roadPlan.headStart),
    [blockPlan, summary.results, settings, quickCatchBlocks, roadPlan.headStart],
  );

  const days = useMemo<DayBit[]>(() => {
    const road = new Map(roadPlan.days.map((d) => [d.id, d]));
    const bits: DayBit[] = ROAD_DAYS.map((d) => {
      const p = road.get(d.id);
      return {
        key: d.id,
        label: d.label.slice(0, 3),
        date: d.dateLabel.replace("Jul ", ""),
        count: p?.fitted ?? 0,
        on: !!p,
        step: 3,
        title: p
          ? `${d.label}: ${p.fitted} raids in the ${d.raidHourLabel} Raid Hour`
          : `${d.label}: not playing — tap to add`,
      };
    });
    for (const dayId of ["sat", "sun"] as const) {
      const fitted = blockPlan.blocks.filter((b) => b.day === dayId).reduce((s, b) => s + b.fitted, 0);
      bits.push({
        key: dayId,
        label: dayId === "sat" ? "Sat" : "Sun",
        date: dayId === "sat" ? "11" : "12",
        count: fitted,
        on: fitted > 0,
        step: 4,
        title: `${dayId === "sat" ? "Saturday" : "Sunday"}: ${fitted} raids across the habitat blocks`,
      });
    }
    return bits;
  }, [roadPlan, blockPlan]);

  const remote = blockPlan.remote;
  const total = days.reduce((s, d) => s + d.count, 0) + (remote?.fitted ?? 0);
  if (progress.required <= 0 && total <= 0) return null;
  const pct = progress.required > 0 ? Math.min(100, Math.round((progress.achievable / progress.required) * 100)) : 0;

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-mono text-[13px] font-bold uppercase tracking-widest text-gofest-accent2">Your 7-day path</h2>
        {progress.required > 0 ? (
          <span className="text-[13px] text-slate-300">
            <b className="text-gofest-acid">{progress.achievable}</b>
            <span className="text-slate-500">
              /{progress.required} raids toward goals · {pct}%
            </span>
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => onJump(d.step)}
            title={d.title}
            className={`rounded-md border px-0.5 py-1.5 text-center transition ${
              d.on
                ? d.step === 3
                  ? "border-gofest-acid/40 bg-gofest-acid/10 hover:border-gofest-acid/70"
                  : "border-gofest-accent2/40 bg-gofest-accent2/10 hover:border-gofest-accent2/70"
                : "border-white/10 bg-gofest-bg/40 opacity-60 hover:opacity-100"
            }`}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {d.label} <span className="text-slate-600">{d.date}</span>
            </div>
            <div className={`font-mono text-sm font-bold ${d.on ? "text-white" : "text-slate-600"}`}>
              {d.count > 0 ? d.count : "·"}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {remote && remote.fitted > 0 ? (
          <button
            type="button"
            onClick={() => onJump(5)}
            className="rounded-md border border-gofest-accent/40 bg-gofest-accent/10 px-2 py-0.5 text-[12px] text-slate-200 transition hover:border-gofest-accent/70"
          >
            🌐 +{remote.fitted} remote — any time, any day
          </button>
        ) : (
          <span className="text-[12px] text-slate-500">🌐 remote raids: none assigned</span>
        )}
        <span className="font-mono text-[12px] uppercase tracking-wide text-slate-500">{total} raids planned</span>
      </div>

      {progress.required > 0 ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gofest-acid transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
    </section>
  );
}
