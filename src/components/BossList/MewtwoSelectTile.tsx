"use client";

import type { RaidBoss } from "@/domain/types";
import { Sprite } from "@/components/ui/Sprite";
import { MegaRelief } from "@/components/ui/MegaRelief";
import { EnamelBadge } from "@/components/ui/EnamelBadge";

/** Emphasized, tall 3D enamel badge for a Mega Mewtwo form (the headliners). */
export function MewtwoSelectTile({
  boss,
  dayLabel,
  selected,
  onToggle,
}: {
  boss: RaidBoss;
  dayLabel: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <EnamelBadge
      types={boss.types}
      selected={selected}
      onToggle={onToggle}
      title={boss.name}
      stageClassName="min-h-[140px]"
    >
      <MegaRelief />
      <span className="absolute left-2 top-2 z-20 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        {dayLabel}
      </span>
      <span className="relative z-10 flex h-full flex-col items-center justify-center gap-1 p-3">
        <Sprite src={boss.sprite} alt={boss.name} size={64} />
        <span className="rounded bg-black/55 px-1.5 text-sm font-bold text-white">{boss.name}</span>
        <span className="rounded bg-black/40 px-1 text-[10px] uppercase tracking-widest text-white/90">Super Mega</span>
      </span>
    </EnamelBadge>
  );
}
