"use client";

import type { RaidBoss } from "@/domain/types";
import { Sprite } from "@/components/ui/Sprite";
import { MegaRelief } from "@/components/ui/MegaRelief";
import { EnamelBadge } from "@/components/ui/EnamelBadge";

export function BossSelectChip({
  boss,
  selected,
  onToggle,
  label,
}: {
  boss: RaidBoss;
  selected: boolean;
  onToggle: () => void;
  label?: string;
}) {
  const isMega = boss.tier === "mega" || boss.tier === "super-mega";

  return (
    <EnamelBadge
      types={boss.types}
      selected={selected}
      onToggle={onToggle}
      title={label ?? boss.name}
      stageClassName="w-[84px]"
    >
      {isMega ? <MegaRelief /> : null}
      <span className="relative z-10 flex flex-col items-center gap-1 p-2">
        <Sprite src={boss.sprite} alt={label ?? boss.name} size={46} />
        <span className="line-clamp-2 rounded bg-black/55 px-1 text-[10px] font-medium leading-tight text-white">
          {label ?? boss.name}
        </span>
      </span>
    </EnamelBadge>
  );
}
