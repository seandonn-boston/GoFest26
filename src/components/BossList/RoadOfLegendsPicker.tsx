"use client";

import { useState } from "react";
import { getBoss } from "@/data";
import { spriteUrl } from "@/data/bosses";
import { ROAD_DAYS } from "@/data/roadOfLegends";
import { energyGoalsForDay } from "@/data/energyGoals";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Sprite } from "@/components/ui/Sprite";
import { PlusToggle } from "@/components/ui/PlusToggle";

interface RoadEntry {
  key: string;
  /** Display name for the exact form featured (e.g. "White Kyurem"). */
  name: string;
  sprite?: string;
  /** Roster boss this selects below (a fused source maps to its base species). */
  targetBossId: string;
}

/**
 * The raids featured on a Road of Legends day. Off-roster fused / primal sources
 * (White Kyurem, Primal Groudon, …) come first with their form-accurate sprite,
 * mapped to the base species you'd target; then the day's roster 5★ + Mega. A
 * base already shown by an energy source (Crowned Zacian on Thursday) isn't
 * repeated by its roster Hero entry.
 */
function entriesForDay(dayId: string, bossIds: string[]): RoadEntry[] {
  const seen = new Set<string>();
  const out: RoadEntry[] = [];
  for (const { bossId, def } of energyGoalsForDay(dayId)) {
    if (seen.has(bossId)) continue;
    seen.add(bossId);
    out.push({ key: `e-${def.source}`, name: def.source, sprite: def.sprite ? spriteUrl(def.sprite) : undefined, targetBossId: bossId });
  }
  for (const id of bossIds) {
    if (seen.has(id)) continue;
    const boss = getBoss(id);
    if (!boss) continue;
    seen.add(id);
    out.push({ key: id, name: boss.name, sprite: boss.sprite, targetBossId: id });
  }
  return out;
}

const DAYS = ROAD_DAYS.map((d) => ({ day: d, entries: entriesForDay(d.id, d.bossIds) }));

/**
 * Collapsible step-1 section listing every Road of Legends raid, by day. Tapping
 * a boss selects the matching species in the roster below AND turns on that day
 * in the Road of Legends head-start picker on step 3.
 */
export function RoadOfLegendsPicker() {
  const [open, setOpen] = useState(false);
  const inputs = usePlannerStore((s) => s.inputs);
  const playDays = usePlannerStore((s) => s.playDays);
  const toggleSelected = usePlannerStore((s) => s.toggleSelected);
  const togglePlayDay = usePlannerStore((s) => s.togglePlayDay);

  const pick = (targetBossId: string, dayId: string) => {
    const wasSelected = !!inputs[targetBossId]?.selected;
    toggleSelected(targetBossId);
    // Selecting (not deselecting) a road target turns on its play day on step 3.
    if (!wasSelected && !playDays[dayId]) togglePlayDay(dayId);
  };

  return (
    <div className="brutal mb-5 rounded-xl bg-gofest-panel/80 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="font-mono text-[13px] font-bold uppercase tracking-widest text-gofest-acid">
          Road of Legends raids · Jul 6–10
        </span>
        <PlusToggle open={open} size={16} className="shrink-0 text-gofest-acid" />
      </button>

      {open ? (
        <div className="mt-3 space-y-4">
          <p className="text-[13px] text-slate-400">
            Pre-farm these the week before. Tapping one selects that species below and marks the day on step 3.
          </p>
          {DAYS.map(({ day, entries }) => (
            <div key={day.id}>
              <div className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
                {day.label} · <span className="text-gofest-accent2">{day.dateLabel}</span>{" "}
                <span className="normal-case text-slate-500">{day.raidHourLabel}</span>
                {playDays[day.id] ? <span className="ml-1.5 text-emerald-300" title="Playing this day">✓</span> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {entries.map((e) => {
                  const selected = !!inputs[e.targetBossId]?.selected;
                  return (
                    <button
                      key={e.key}
                      type="button"
                      onClick={() => pick(e.targetBossId, day.id)}
                      aria-pressed={selected}
                      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-left text-[13px] transition ${
                        selected
                          ? "border-gofest-accent2 bg-gofest-accent2/15 text-white"
                          : "border-white/15 bg-gofest-bg/40 text-slate-300 hover:border-white/35"
                      }`}
                    >
                      <Sprite src={e.sprite} alt={e.name} size={28} />
                      <span className="whitespace-nowrap">{e.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
