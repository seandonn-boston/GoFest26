"use client";

import type { RaidBoss } from "@/domain/types";
import { typeBackgroundStyle } from "@/data/typeVisuals";
import { Sprite } from "@/components/ui/Sprite";
import { MegaGlyph } from "@/components/ui/MegaGlyph";

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
          ? "outline outline-2 outline-white outline-offset-2"
          : "hover:outline hover:outline-2 hover:outline-white/40 hover:outline-offset-2"
      }`}
    >
      {isMega ? (
        <MegaGlyph className="pointer-events-none absolute inset-x-0 top-2 z-[1] mx-auto h-11 w-11 text-white/40" />
      ) : null}
      {selected ? (
        <span className="absolute right-1 top-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] text-gofest-bg">
          ✓
        </span>
      ) : null}
      <span className="relative z-10 flex flex-col items-center gap-1 p-2">
        <Sprite src={boss.sprite} alt={label ?? boss.name} size={46} />
        <span className="line-clamp-2 text-[10px] font-medium leading-tight text-white drop-shadow">
          {label ?? boss.name}
        </span>
      </span>
    </button>
  );
}
