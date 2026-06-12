"use client";

import { RAID_BOSSES, HABITATS, MEWTWO_X_ID, MEWTWO_Y_ID, getBoss, GAME_CONFIG } from "@/data";
import type { EventDay } from "@/domain/types";
import { bossIsLocal } from "@/domain/region";
import { hourLabel } from "@/lib/format";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Card } from "@/components/ui/Card";
import { BossSelectChip } from "./BossSelectChip";
import { MewtwoSelectTile } from "./MewtwoSelectTile";

const DAY_LONG: Record<EventDay, string> = { sat: "Saturday", sun: "Sunday" };

export function BossList() {
  const inputs = usePlannerStore((s) => s.inputs);
  const toggleSelected = usePlannerStore((s) => s.toggleSelected);
  const region = usePlannerStore((s) => s.settings.region);

  const selectedCount = Object.values(inputs).filter((i) => i.selected).length;
  const start = GAME_CONFIG.event.hourStartLocal;

  const mewtwoX = getBoss(MEWTWO_X_ID)!;
  const mewtwoY = getBoss(MEWTWO_Y_ID)!;

  // Group the remaining roster by habitat hour-block (day + time window).
  const groups = HABITATS.map((h) => ({
    habitat: h,
    bosses: RAID_BOSSES.filter(
      (b) =>
        b.id !== MEWTWO_X_ID &&
        b.id !== MEWTWO_Y_ID &&
        b.windows.some((w) => w.day === h.day && w.startHour === h.startHour && w.endHour === h.endHour),
    ),
  }));

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">1. Pick your raid targets</h2>
        <span className="text-sm text-slate-400">{selectedCount} selected</span>
      </div>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-slate-500">
        <span className="rounded-sm bg-gofest-accent px-1 py-[1px] font-extrabold text-black">Remote</span>{" "}
        = not raidable in {region.label}; needs a Remote Raid Pass (capped per day).
      </p>

      {/* Headliners — Mega Mewtwo X (Sat) left, Y (Sun) right */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <MewtwoSelectTile
          boss={mewtwoX}
          dayLabel="Saturday"
          selected={!!inputs[MEWTWO_X_ID]?.selected}
          onToggle={() => toggleSelected(MEWTWO_X_ID)}
        />
        <MewtwoSelectTile
          boss={mewtwoY}
          dayLabel="Sunday"
          selected={!!inputs[MEWTWO_Y_ID]?.selected}
          onToggle={() => toggleSelected(MEWTWO_Y_ID)}
        />
      </div>

      <div className="space-y-4">
        {groups.map(({ habitat, bosses }) => (
          <div key={`${habitat.day}-${habitat.startHour}`}>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {DAY_LONG[habitat.day]} · {hourLabel(habitat.startHour, start)}–{hourLabel(habitat.endHour, start)}
              <span className="ml-2 normal-case text-gofest-accent2">{habitat.name}</span>
              <span className="ml-1 hidden normal-case text-slate-500 sm:inline">({habitat.types.join("/")})</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {bosses.map((boss) => (
                <BossSelectChip
                  key={boss.id}
                  boss={boss}
                  selected={!!inputs[boss.id]?.selected}
                  onToggle={() => toggleSelected(boss.id)}
                  remoteOnly={!bossIsLocal(boss, region)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
