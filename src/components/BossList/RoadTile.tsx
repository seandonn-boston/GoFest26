"use client";

import { memo } from "react";
import { getBoss } from "@/data";
import { spriteUrl } from "@/data/bosses";
import type { EnergyGoalDef, RaidBoss } from "@/domain/types";
import { tileTitle, tileTitleForSource } from "@/lib/tileTitle";
import { usePlannerStore } from "@/store/usePlannerStore";
import { TileSprite } from "@/components/ui/TileSprite";
import { MegaRelief } from "@/components/ui/MegaRelief";
import { EnamelBadge } from "@/components/ui/EnamelBadge";

/**
 * A Road of Legends selection tile. It represents EITHER a roster boss or a
 * fusion/primal special-forme energy goal, and reflects/drives the correct state
 * depending on the coupling mode: coupled (default) → the same weekend `selected`
 * / `energy.on` the rest of the app uses; decoupled → the independent
 * `roadSelected` / `roadEnergy` sets. Like BossSelectChip it subscribes only to
 * the primitives it needs and is memoized, so toggling one tile re-renders one tile.
 */
type RoadTileProps =
  | { kind: "boss"; boss: RaidBoss }
  | { kind: "energy"; bossId: string; def: EnergyGoalDef };

const STAGE = "h-[90px] w-[84px]";
const LABEL = (
  text: string,
): React.ReactNode => (
  <span className="absolute inset-x-0 bottom-1.5 z-10 flex justify-center px-1">
    <span className="enamel-label min-w-0 max-w-full overflow-hidden whitespace-nowrap text-[12px] leading-tight">{text}</span>
  </span>
);

function BossRoadTile({ boss }: { boss: RaidBoss }) {
  const coupled = usePlannerStore((s) => s.roadCoupled);
  const weekendSelected = usePlannerStore((s) => !!s.inputs[boss.id]?.selected);
  const roadSelected = usePlannerStore((s) => !!s.roadSelected[boss.id]);
  const toggleSelected = usePlannerStore((s) => s.toggleSelected);
  const toggleRoadTarget = usePlannerStore((s) => s.toggleRoadTarget);

  const selected = coupled ? weekendSelected : roadSelected;
  const isMega = boss.tier === "mega" || boss.tier === "super-mega";
  return (
    <EnamelBadge
      types={boss.types}
      selected={selected}
      onToggle={() => (coupled ? toggleSelected(boss.id) : toggleRoadTarget(boss.id))}
      title={boss.name}
      stageClassName={STAGE}
    >
      {isMega ? <MegaRelief /> : null}
      <TileSprite src={boss.sprite} alt={boss.name} />
      {LABEL(tileTitle(boss))}
    </EnamelBadge>
  );
}

function EnergyRoadTile({ bossId, def }: { bossId: string; def: EnergyGoalDef }) {
  const coupled = usePlannerStore((s) => s.roadCoupled);
  const energyOn = usePlannerStore((s) => !!s.inputs[bossId]?.energy?.[def.key]?.on);
  const energyGoal = usePlannerStore((s) => s.inputs[bossId]?.energy?.[def.key]?.goal ?? 0);
  const roadOn = usePlannerStore((s) => (s.roadEnergy[bossId] ?? []).includes(def.key));
  const setEnergy = usePlannerStore((s) => s.setEnergy);
  const toggleRoadEnergy = usePlannerStore((s) => s.toggleRoadEnergy);

  const selected = coupled ? energyOn : roadOn;
  const base = getBoss(bossId);
  // The fused forme's card styling uses the base types plus its added type(s).
  const types = [...(base?.types ?? []), ...(def.addedTypes ?? [])];
  const sprite = def.sprite ? spriteUrl(def.sprite) : base?.sprite;

  const onToggle = () => {
    if (coupled) {
      // Seed the goal to the fuse/revert cost the first time it's switched on.
      setEnergy(bossId, def.key, { on: !energyOn, goal: energyGoal > 0 ? energyGoal : def.cost });
    } else {
      toggleRoadEnergy(bossId, def.key);
    }
  };

  return (
    <EnamelBadge types={types} selected={selected} onToggle={onToggle} title={def.source} stageClassName={STAGE}>
      <TileSprite src={sprite} alt={def.source} />
      {LABEL(tileTitleForSource(def.source))}
    </EnamelBadge>
  );
}

export const RoadTile = memo(function RoadTile(props: RoadTileProps) {
  return props.kind === "boss" ? (
    <BossRoadTile boss={props.boss} />
  ) : (
    <EnergyRoadTile bossId={props.bossId} def={props.def} />
  );
});
