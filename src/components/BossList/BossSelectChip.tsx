"use client";

import type { RaidBoss } from "@/domain/types";
import { typeBackgroundStyle } from "@/data/typeVisuals";
import { Sprite } from "@/components/ui/Sprite";
import { MegaRelief } from "@/components/ui/MegaRelief";

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
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      title={label ?? boss.name}
      style={typeBackgroundStyle(boss.types)}
      className={`enamel enamel-bezel relative flex w-[84px] flex-col items-center rounded-xl transition ${
        selected
          ? "outline outline-[3px] outline-gofest-accent2 outline-offset-2"
          : "hover:outline hover:outline-2 hover:outline-white/40 hover:outline-offset-2"
      }`}
    >
      {isMega ? <MegaRelief /> : null}
      <span className="relative z-10 flex flex-col items-center gap-1 p-2">
        <Sprite src={boss.sprite} alt={label ?? boss.name} size={46} />
        <span className="line-clamp-2 rounded bg-black/55 px-1 text-[10px] font-medium leading-tight text-white">
          {label ?? boss.name}
        </span>
      </span>
    </button>
  );
}
