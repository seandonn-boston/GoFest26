"use client";

import type { RaidBoss } from "@/domain/types";
import { tileTitle } from "@/lib/tileTitle";
import { TileSprite } from "@/components/ui/TileSprite";
import { MegaRelief } from "@/components/ui/MegaRelief";
import { EnamelBadge } from "@/components/ui/EnamelBadge";

export function BossSelectChip({
  boss,
  selected,
  onToggle,
}: {
  boss: RaidBoss;
  selected: boolean;
  onToggle: () => void;
}) {
  const isMega = boss.tier === "mega" || boss.tier === "super-mega";
  const short = tileTitle(boss);

  return (
    <EnamelBadge
      types={boss.types}
      selected={selected}
      onToggle={onToggle}
      title={boss.name}
      stageClassName="h-[90px] w-[84px]"
    >
      {isMega ? <MegaRelief /> : null}
      <TileSprite src={boss.sprite} alt={boss.name} />
      <span className="absolute inset-x-0 bottom-2 z-10 flex justify-center px-1">
        <span className="line-clamp-1 rounded bg-black/60 px-1 text-[10px] font-medium leading-tight text-white">
          {short}
        </span>
      </span>
    </EnamelBadge>
  );
}
