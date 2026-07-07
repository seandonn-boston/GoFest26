"use client";

import { useMemo } from "react";
import type { RoadPlan, WeekendBlockPlan } from "@/domain";
import { weekPlanLines, type WeekPlanLine } from "@/lib/weekPlan";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Sprite } from "@/components/ui/Sprite";

/**
 * The in-app Week Plan tracker — the same chronological lines as the Excel
 * export's tracker sheet, kept on the Results step so nothing has to be
 * exported to follow the plan. THIS is where completed raids are logged (the
 * priority screens only plan); each line is an editable Done count against the
 * raids the plan schedules there, with per-day subtotals and an overall bar.
 */
export function WeekTracker({ blockPlan, roadPlan }: { blockPlan: WeekendBlockPlan; roadPlan: RoadPlan }) {
  const raidsDone = usePlannerStore((s) => s.raidsDone);
  const setRaidsDone = usePlannerStore((s) => s.setRaidsDone);

  const lines = useMemo(() => weekPlanLines(roadPlan, blockPlan), [roadPlan, blockPlan]);
  // Group consecutively by day label — the lines are already chronological.
  const groups = useMemo(() => {
    const out: { dayLabel: string; lines: WeekPlanLine[] }[] = [];
    for (const l of lines) {
      const last = out[out.length - 1];
      if (last && last.dayLabel === l.dayLabel) last.lines.push(l);
      else out.push({ dayLabel: l.dayLabel, lines: [l] });
    }
    return out;
  }, [lines]);
  if (!lines.length) return null;

  const target = lines.reduce((s, l) => s + l.target, 0);
  // Over-logging a line (doing extra raids) never counts past its target, so the
  // headline can't read >100% while another line is still open.
  const done = lines.reduce((s, l) => s + Math.min(raidsDone[l.doneKey] ?? 0, l.target), 0);
  const pct = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
  const complete = done >= target;

  return (
    <div className="rounded-lg border border-white/10 bg-gofest-bg/30 p-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold text-slate-200">Track your raids</h3>
        <span className="text-xs text-slate-400">
          <span className={`font-mono font-bold ${complete ? "text-emerald-300" : "text-gofest-accent2"}`}>
            {done}/{target}
          </span>{" "}
          raids done
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-inset ring-white/10">
        <div
          className={`h-full rounded-full ${complete ? "bg-emerald-400" : "bg-gofest-accent2"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[12px] leading-snug text-slate-500">
        Log raids as you do them — each line is one window of your plan, in order. A line turns green when it&apos;s
        finished. The Excel export carries the same tracker (pre-filled with these counts).
      </p>

      <div className="mt-2 space-y-2.5">
        {groups.map((g) => {
          const gTarget = g.lines.reduce((s, l) => s + l.target, 0);
          const gDone = g.lines.reduce((s, l) => s + Math.min(raidsDone[l.doneKey] ?? 0, l.target), 0);
          const gComplete = gDone >= gTarget;
          return (
            <div key={g.dayLabel}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold uppercase tracking-wide text-gofest-accent2">{g.dayLabel}</span>
                <span className={`font-mono text-[12px] font-bold ${gComplete ? "text-emerald-300" : "text-slate-400"}`}>
                  {gDone}/{gTarget}
                </span>
              </div>
              <div className="space-y-1">
                {g.lines.map((l) => {
                  const d = raidsDone[l.doneKey] ?? 0;
                  const left = Math.max(0, l.target - d);
                  const rowDone = left === 0;
                  return (
                    <div
                      key={l.doneKey}
                      className={`flex items-center gap-2 rounded-md border px-2 py-1 ${
                        rowDone ? "border-emerald-400/40 bg-emerald-400/[0.07]" : "border-white/10 bg-gofest-bg/40"
                      }`}
                    >
                      <Sprite src={l.sprite} alt={l.bossName} size={24} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-slate-200">{l.bossName.replace(/^Mega /, "")}</span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {l.window}
                          {l.pass === "Remote" ? " · remote" : ""} · banks {l.banks}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 font-mono text-sm font-bold">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={String(d)}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) =>
                            setRaidsDone(l.doneKey, Math.round(Number(e.target.value.replace(/[^\d]/g, "")) || 0))
                          }
                          aria-label={`Raids completed — ${l.bossName}, ${l.dayLabel}`}
                          className={`w-10 rounded-sm border bg-gofest-bg/60 px-1 py-0.5 text-center outline-none focus:border-gofest-accent2 ${
                            rowDone ? "border-emerald-400/50 text-emerald-200" : "border-white/15 text-slate-100"
                          }`}
                        />
                        <span className="text-slate-500">/</span>
                        <span
                          className={rowDone ? "text-emerald-300" : "text-gofest-accent2"}
                          title="Raids your plan schedules in this window"
                        >
                          {l.target}
                        </span>
                      </span>
                      <span className="w-14 shrink-0 text-right text-[11px]">
                        {rowDone ? (
                          <span className="font-semibold text-emerald-300">✓ done</span>
                        ) : (
                          <span className="text-slate-500">{left} left</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
