"use client";

import { getBoss } from "@/data";
import { ROAD_DAYS, type RoadDay } from "@/data/roadOfLegends";
import { energyGoalsForDay } from "@/data/energyGoals";
import { bossIsLocal } from "@/domain/region";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Disclosure } from "@/components/ui/Disclosure";
import { PlusToggle } from "@/components/ui/PlusToggle";
import { useExpandable } from "@/hooks/useExpandable";
import { RoadTile } from "./RoadTile";

/** The day's tiles: its fusion/primal special-forme goals first (the headline),
 *  then the day's featured roster bosses. Remote-only bosses (Monday's marathon
 *  includes the region-locked Ultra Beasts) are hidden — their tiles live in the
 *  Remote raids section, alongside their availability windows. */
function DayTiles({ day }: { day: RoadDay }) {
  const region = usePlannerStore((s) => s.settings.region);
  const energy = energyGoalsForDay(day.id);
  const bosses = day.bossIds
    .map((id) => getBoss(id))
    .filter((b): b is NonNullable<typeof b> => !!b)
    .filter((b) => bossIsLocal(b, region));
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {energy.map(({ bossId, def }) => (
        <RoadTile key={`${bossId}-${def.key}`} kind="energy" bossId={bossId} def={def} />
      ))}
      {bosses.map((boss) => (
        <RoadTile key={boss.id} kind="boss" boss={boss} />
      ))}
    </div>
  );
}

function DayRow({ day }: { day: RoadDay }) {
  return (
    <div>
      <div className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-slate-400">
        {day.label}
        <span className="ml-2 normal-case text-slate-500">
          {day.dateLabel} · Raid Hour {day.raidHourLabel}
        </span>
      </div>
      <DayTiles day={day} />
    </div>
  );
}

/**
 * Road of Legends selection section (Step 1). Leads the page — the raid week
 * comes first chronologically — above the Remote raids section and the Mega
 * Mewtwo headliners. Lets the player pick the weekday
 * raid-week targets — including the fusion/primal special raids as their own
 * tiles. A coupling toggle (on by default) mirrors the weekend targets; off lets
 * the player build an independent Road of Legends agenda.
 */
export function RoadOfLegendsSection() {
  const [open, setOpen] = useExpandable(false);
  const coupled = usePlannerStore((s) => s.roadCoupled);
  const toggleRoadCoupled = usePlannerStore((s) => s.toggleRoadCoupled);

  const monday = ROAD_DAYS.find((d) => d.id === "mon");
  const weekdays = ROAD_DAYS.filter((d) => d.id !== "mon");

  return (
    <section className="mb-5 rounded-lg border border-orange-400/25 bg-orange-400/[0.04]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-1.5 p-3 text-left"
      >
        <h3 className="text-sm font-semibold text-orange-400">Road of Legends · Mon–Fri 6–8pm — Fusions and Primal</h3>
        <PlusToggle open={open} size={15} className="shrink-0 text-orange-400" />
      </button>

      {open ? (
        <div className="px-3 pb-3">
          <label className="mb-2 flex cursor-pointer items-center gap-1.5 text-[12px] text-slate-300">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-orange-400"
              checked={coupled}
              onChange={toggleRoadCoupled}
            />
            Couple with my GO Fest targets
          </label>
          <p className="mb-3 text-[13px] text-slate-400">
            {coupled ? (
              <>
                These mirror your weekend targets — tap a tile to add it to your plan. Fusion/Primal tiles turn on that
                Pokémon&apos;s energy goal.
              </>
            ) : (
              <>
                Independent Road of Legends agenda — pick whatever you&apos;ll raid this week, separate from your GO Fest
                targets.
              </>
            )}
          </p>

          <div className="space-y-4">
            {monday ? (
              <Disclosure title={`Monday · ${monday.dateLabel} · full 5★ roster`}>
                <DayTiles day={monday} />
              </Disclosure>
            ) : null}
            {weekdays.map((day) => (
              <DayRow key={day.id} day={day} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
