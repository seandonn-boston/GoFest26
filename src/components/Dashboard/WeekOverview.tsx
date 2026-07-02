"use client";

import { useEffect, useMemo, useState } from "react";
import { RAID_BOSSES } from "@/data";
import { ROAD_DAYS } from "@/data/roadOfLegends";
import { goalProgress, type RoadPlan, type WeekendBlockPlan } from "@/domain";
import { bossIsLocal } from "@/domain/region";
import { remoteWindowsForBoss } from "@/domain/remoteWindows";
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

interface RemoteMark {
  /** Any window on this day starts in the local night (9 PM–6 AM) → 🌙. */
  overnight: boolean;
  /** Tooltip lines, e.g. "Xurkitree: Sun 12:00 AM–3:00 AM (Tokyo)". */
  lines: string[];
}

/** Calendar day-of-month (viewer-local) → 7-day-path chip key. Windows that
 *  spill just outside the event week (far-west/-east viewers) clamp to the
 *  nearest chip — the tooltip still carries the exact local time. */
const DOM_TO_KEY: Record<number, string> = { 6: "mon", 7: "tue", 8: "wed", 9: "thu", 10: "fri", 11: "sat", 12: "sun" };
const chipKeyForDate = (dom: number): string => DOM_TO_KEY[dom] ?? (dom < 6 ? "mon" : "sun");

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
  const selectedIds = usePlannerStore((s) => {
    const out: string[] = [];
    for (const id in s.inputs) if (s.inputs[id].selected) out.push(id);
    return out.join(",");
  });
  // Remote-window marks depend on the device timezone, which the static
  // prerender can't know — added after mount so hydration stays clean.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const progress = useMemo(
    () => goalProgress(blockPlan, summary.results, settings, quickCatchBlocks, roadPlan.headStart),
    [blockPlan, summary.results, settings, quickCatchBlocks, roadPlan.headStart],
  );

  // 🌙 "be awake for this" markers: each selected region-locked target's anchor
  // windows, bucketed onto the viewer-local calendar day they start on.
  const remoteMarks = useMemo(() => {
    const marks = new Map<string, RemoteMark>();
    if (!mounted) return marks;
    const ids = new Set(selectedIds.split(",").filter(Boolean));
    const fmt = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
    for (const boss of RAID_BOSSES) {
      if (!ids.has(boss.id) || bossIsLocal(boss, settings.region)) continue;
      for (const w of remoteWindowsForBoss(boss) ?? []) {
        const local = new Date(w.anchorStartUtc);
        const key = chipKeyForDate(local.getDate());
        const overnight = local.getHours() >= 21 || local.getHours() < 6;
        const mark = marks.get(key) ?? { overnight: false, lines: [] };
        mark.overnight = mark.overnight || overnight;
        mark.lines.push(`${boss.name}: ${fmt.format(w.anchorStartUtc)}–${fmt.format(w.anchorEndUtc)} (${w.anchorCity})`);
        marks.set(key, mark);
      }
    }
    return marks;
  }, [mounted, selectedIds, settings.region]);

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
        {days.map((d) => {
          const mark = remoteMarks.get(d.key);
          const title = mark ? `${d.title}\nRemote windows (your time):\n${mark.lines.join("\n")}` : d.title;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onJump(d.step)}
              title={title}
              className={`relative rounded-md border px-0.5 py-1.5 text-center transition ${
                d.on
                  ? d.step === 3
                    ? "border-gofest-acid/40 bg-gofest-acid/10 hover:border-gofest-acid/70"
                    : "border-gofest-accent2/40 bg-gofest-accent2/10 hover:border-gofest-accent2/70"
                  : "border-white/10 bg-gofest-bg/40 opacity-60 hover:opacity-100"
              }`}
            >
              {mark ? (
                <span aria-hidden className="absolute -right-0.5 -top-1.5 text-[11px]">
                  {mark.overnight ? "🌙" : "🕑"}
                </span>
              ) : null}
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {d.label} <span className="text-slate-600">{d.date}</span>
              </div>
              <div className={`font-mono text-sm font-bold ${d.on ? "text-white" : "text-slate-600"}`}>
                {d.count > 0 ? d.count : "·"}
              </div>
            </button>
          );
        })}
      </div>

      {remoteMarks.size > 0 ? (
        <button
          type="button"
          onClick={() => onJump(5)}
          className="mt-1.5 block w-full text-left text-[12px] text-slate-500 transition hover:text-slate-300"
        >
          🌙 = overnight remote window for a region-locked target — tap for exact times on the Remote step
        </button>
      ) : null}

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
