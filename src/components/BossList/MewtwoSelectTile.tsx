"use client";

import type { RaidBoss } from "@/domain/types";
import { typeBackgroundStyle } from "@/data/typeVisuals";
import { Sprite } from "@/components/ui/Sprite";
import { MegaGlyph } from "@/components/ui/MegaGlyph";

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
      className={`enamel relative flex min-h-[136px] flex-col items-center justify-center rounded-2xl transition ${
        selected ? "outline outline-2 outline-white outline-offset-2" : "opacity-90 hover:opacity-100"
      }`}
    >
      <MegaGlyph className="pointer-events-none absolute inset-0 z-[1] m-auto h-24 w-24 text-white/40" />
      <span className="absolute left-2 top-2 z-20 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        {dayLabel}
      </span>
      {selected ? (
        <span className="absolute right-2 top-2 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs text-gofest-bg">
          ✓
        </span>
      ) : null}
      <span className="relative z-10 flex flex-col items-center gap-1 p-3">
        <Sprite src={boss.sprite} alt={boss.name} size={64} />
        <span className="text-sm font-bold text-white drop-shadow">{boss.name}</span>
        <span className="text-[10px] uppercase tracking-widest text-white/85">Super Mega</span>
      </span>
    </button>
  );
}
