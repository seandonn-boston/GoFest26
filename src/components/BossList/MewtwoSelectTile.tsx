"use client";

import type { RaidBoss } from "@/domain/types";
import { typeBackgroundStyle } from "@/data/typeVisuals";
import { Sprite } from "@/components/ui/Sprite";
import { MegaGlyph } from "@/components/ui/MegaGlyph";

/** Emphasized, tall selection button for a Mega Mewtwo form (the headliners). */
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
      className={`relative flex min-h-[136px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 transition ${
        selected
          ? "border-white ring-2 ring-white shadow-lg shadow-gofest-mewtwo/40"
          : "border-white/30 opacity-90 hover:opacity-100 hover:border-white/70"
      }`}
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/55" />
      <MegaGlyph className="pointer-events-none absolute inset-0 m-auto h-24 w-24 text-white/35" />
      <span className="absolute left-2 top-2 z-10 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
        {dayLabel}
      </span>
      {selected ? (
        <span className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs text-gofest-bg">
          ✓
        </span>
      ) : null}
      <span className="relative z-10 flex flex-col items-center gap-1 p-3">
        <Sprite src={boss.sprite} alt={boss.name} size={64} />
        <span className="text-sm font-bold text-white drop-shadow">{boss.name}</span>
        <span className="text-[10px] uppercase tracking-widest text-white/80">Super Mega</span>
      </span>
    </button>
  );
}
