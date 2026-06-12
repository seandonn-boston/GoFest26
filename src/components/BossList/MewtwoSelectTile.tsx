"use client";

import { memo } from "react";
import type { RaidBoss } from "@/domain/types";
import { usePlannerStore } from "@/store/usePlannerStore";
import { TileSprite } from "@/components/ui/TileSprite";
import { MegaRelief } from "@/components/ui/MegaRelief";
import { EnamelBadge } from "@/components/ui/EnamelBadge";

/** Emphasized, tall 3D enamel badge for a Mega Mewtwo form (the headliners).
 *  Self-subscribes to its own selected flag and is memoized (see BossSelectChip). */
function MewtwoSelectTileImpl({ boss, dayLabel }: { boss: RaidBoss; dayLabel: string }) {
  const selected = usePlannerStore((s) => !!s.inputs[boss.id]?.selected);
  const toggleSelected = usePlannerStore((s) => s.toggleSelected);

  return (
    <EnamelBadge
      types={boss.types}
      selected={selected}
      onToggle={() => toggleSelected(boss.id)}
      title={boss.name}
      stageClassName="min-h-[150px]"
    >
      <MegaRelief />
      <TileSprite src={boss.sprite} alt={boss.name} />
      <span className="absolute left-2 top-2 z-20 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        {dayLabel}
      </span>
      <span className="absolute inset-x-0 bottom-2 z-10 flex flex-col items-center gap-0.5 px-1">
        <span className="rounded bg-black/60 px-1.5 text-sm font-bold text-white">{boss.name}</span>
        <span className="rounded bg-black/45 px-1 text-[10px] uppercase tracking-widest text-white/90">
          Super Mega
        </span>
      </span>
    </EnamelBadge>
  );
}

export const MewtwoSelectTile = memo(MewtwoSelectTileImpl);
