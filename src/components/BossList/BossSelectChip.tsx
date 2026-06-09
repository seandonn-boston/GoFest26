"use client";

import type { RaidBoss } from "@/domain/types";
import { tileTitle } from "@/lib/tileTitle";
import { regionScopeLabel } from "@/domain/region";
import { TileSprite } from "@/components/ui/TileSprite";
import { MegaRelief } from "@/components/ui/MegaRelief";
import { EnamelBadge } from "@/components/ui/EnamelBadge";

export function BossSelectChip({
  boss,
  selected,
  onToggle,
  remoteOnly = false,
}: {
  boss: RaidBoss;
  selected: boolean;
  onToggle: () => void;
  remoteOnly?: boolean;
}) {
  const isMega = boss.tier === "mega" || boss.tier === "super-mega";
  const short = tileTitle(boss);
  const regionLabel = regionScopeLabel(boss.region);
  const title = remoteOnly
    ? `${boss.name} — remote raid only${regionLabel ? ` (${regionLabel})` : ""}`
    : boss.name;

  return (
    <EnamelBadge
      types={boss.types}
      selected={selected}
      onToggle={onToggle}
      title={title}
      stageClassName="h-[90px] w-[84px]"
    >
      {isMega ? <MegaRelief /> : null}
      <TileSprite src={boss.sprite} alt={boss.name} />
      {remoteOnly ? (
        <span className="absolute left-1 top-1 z-20 rounded-sm border border-black/30 bg-gofest-accent px-1 py-[1px] font-mono text-[8px] font-extrabold uppercase leading-none tracking-wider text-black shadow">
          Remote
        </span>
      ) : null}
      <span className="absolute inset-x-0 bottom-2 z-10 flex justify-center px-1">
        <span className="line-clamp-1 rounded bg-black/60 px-1 text-[10px] font-medium leading-tight text-white">
          {short}
        </span>
      </span>
    </EnamelBadge>
  );
}
