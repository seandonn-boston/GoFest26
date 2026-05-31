"use client";

import type { RaidBoss } from "@/domain/types";
import { typeBackgroundStyle } from "@/data/typeVisuals";
import { Sprite } from "@/components/ui/Sprite";
import { MegaRelief } from "@/components/ui/MegaRelief";

/** Emphasized, tall enamel-pin selection button for a Mega Mewtwo form. */
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
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      style={typeBackgroundStyle(boss.types)}
      className={`enamel enamel-bezel relative flex min-h-[136px] flex-col items-center justify-center rounded-2xl transition ${
        selected
          ? "outline outline-[3px] outline-gofest-accent2 outline-offset-2"
          : "hover:outline hover:outline-2 hover:outline-white/40 hover:outline-offset-2"
      }`}
    >
      <MegaRelief />
      <span className="absolute left-2 top-2 z-20 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        {dayLabel}
      </span>
      <span className="relative z-10 flex flex-col items-center gap-1 p-3">
        <Sprite src={boss.sprite} alt={boss.name} size={64} />
        <span className="rounded bg-black/55 px-1.5 text-sm font-bold text-white">{boss.name}</span>
        <span className="rounded bg-black/40 px-1 text-[10px] uppercase tracking-widest text-white/90">Super Mega</span>
      </span>
    </button>
  );
}
