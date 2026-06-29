"use client";

import { memo } from "react";
import type { RaidBoss } from "@/domain/types";
import { tileTitle } from "@/lib/tileTitle";
import { regionScopeLabel } from "@/domain/region";
import { usePlannerStore } from "@/store/usePlannerStore";
import { TileSprite } from "@/components/ui/TileSprite";
import { MegaRelief } from "@/components/ui/MegaRelief";
import { EnamelBadge } from "@/components/ui/EnamelBadge";

/**
 * One selectable roster tile. It subscribes to ITS OWN selected flag (not the
 * whole inputs map) and is memoized, so toggling one boss — or typing in any
 * card — re-renders only the tile that actually changed, not all ~50 enamel
 * badges. `remoteOnly` is derived from the (rarely-changing) region by the parent.
 */
function BossSelectChipImpl({ boss, remoteOnly = false }: { boss: RaidBoss; remoteOnly?: boolean }) {
  const selected = usePlannerStore((s) => !!s.inputs[boss.id]?.selected);
  const toggleSelected = usePlannerStore((s) => s.toggleSelected);

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
      onToggle={() => toggleSelected(boss.id)}
      title={title}
      stageClassName="h-[90px] w-[84px]"
    >
      {isMega ? <MegaRelief /> : null}
      <TileSprite src={boss.sprite} alt={boss.name} />
      {remoteOnly ? (
        <span className="absolute left-1 top-1 z-20 rounded-sm border border-black/30 bg-gofest-accent px-1 py-[1px] font-mono text-[10px] font-extrabold uppercase leading-none tracking-wider text-black shadow">
          Remote
        </span>
      ) : null}
      <span className="absolute inset-x-0 bottom-1.5 z-10 flex justify-center px-1">
        <span className="enamel-label line-clamp-1 text-[12px] leading-tight">{short}</span>
      </span>
    </EnamelBadge>
  );
}

export const BossSelectChip = memo(BossSelectChipImpl);
