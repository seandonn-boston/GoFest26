"use client";

import { GAME_CONFIG } from "@/data/config";
import { habitatAt } from "@/data/habitats";
import type { EventDay, Schedule, ScheduledRaid } from "@/domain/types";
import { hourLabel } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { ScheduleRow } from "./ScheduleRow";

const DAY_LABEL: Record<EventDay, string> = {
  sat: "Saturday · July 11",
  sun: "Sunday · July 12",
};

interface HourGroup {
  hour: number;
  raids: { raid: ScheduledRaid; index: number }[];
}

function groupByDayHour(schedule: Schedule) {
  const numbered = schedule.raids.map((raid, i) => ({ raid, index: i + 1 }));
  const days: { day: EventDay; hours: HourGroup[] }[] = [];
  for (const day of ["sat", "sun"] as EventDay[]) {
    const dayRaids = numbered.filter((r) => r.raid.day === day);
    if (dayRaids.length === 0) continue;
    const hours: HourGroup[] = [];
    for (const item of dayRaids) {
      let group = hours.find((h) => h.hour === item.raid.hour);
      if (!group) {
        group = { hour: item.raid.hour, raids: [] };
        hours.push(group);
      }
      group.raids.push(item);
    }
    hours.sort((a, b) => a.hour - b.hour);
    days.push({ day, hours });
  }
  return days;
}

export function ScheduleView({ schedule }: { schedule: Schedule }) {
  if (schedule.raids.length === 0) return null;
  const grouped = groupByDayHour(schedule);
  const startLocal = GAME_CONFIG.event.hourStartLocal;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Your raid schedule</h2>
        <span className="text-sm text-slate-400">{schedule.raids.length} raids</span>
      </div>
      <p className="mb-4 text-sm text-slate-400">
        Limited-window legendaries are placed first; all-weekend Mega Mewtwo backfills the rest so
        you never overshoot. Times are your local event time.
      </p>

      {schedule.unmetGoals.length > 0 ? (
        <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          <p className="font-medium">⚠ Some goals don&apos;t fit their raid windows:</p>
          <ul className="mt-1 list-inside list-disc text-rose-200/90">
            {schedule.unmetGoals.map((u) => (
              <li key={u.bossId}>
                {u.bossName}: {u.shortfall} more raid{u.shortfall === 1 ? "" : "s"} needed than its windows allow.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-5">
        {grouped.map(({ day, hours }) => (
          <div key={day}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gofest-accent2">
              {DAY_LABEL[day]}
            </h3>
            <div className="space-y-3">
              {hours.map((h) => (
                <div key={h.hour}>
                  <div className="mb-1 text-xs font-medium text-slate-400">
                    {hourLabel(h.hour, startLocal)} — {hourLabel(h.hour + 1, startLocal)}
                    {habitatAt(day, h.hour) ? (
                      <span className="ml-2 text-gofest-accent2">{habitatAt(day, h.hour)!.name}</span>
                    ) : null}
                    <span className="ml-2 text-slate-500">({h.raids.length} raids)</span>
                  </div>
                  <div className="space-y-1.5">
                    {h.raids.map(({ raid, index }) => (
                      <ScheduleRow key={`${raid.bossId}-${index}`} raid={raid} index={index} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
