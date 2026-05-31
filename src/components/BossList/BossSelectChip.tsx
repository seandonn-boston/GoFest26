"use client";

import type { RaidBoss } from "@/domain/types";
import { Sprite } from "@/components/ui/Sprite";

const TIER_DOT: Record<RaidBoss["tier"], string> = {
  "super-mega": "bg-gofest-mewtwo",
  mega: "bg-fuchsia-400",
  "five-star": "bg-amber-400",
  regional: "bg-emerald-400",
};

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
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      title={label ?? boss.name}
      className={`relative flex w-[84px] flex-col items-center gap-1 rounded-xl border p-2 text-center transition ${
        selected
          ? "border-gofest-accent2 bg-gofest-accent2/15 ring-1 ring-gofest-accent2"
          : "border-white/10 bg-white/5 hover:border-white/30"
      }`}
    >
      <span className={`absolute left-1.5 top-1.5 h-2 w-2 rounded-full ${TIER_DOT[boss.tier]}`} />
      {selected ? (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gofest-accent2 text-[10px] text-gofest-bg">
          ✓
        </span>
      ) : null}
      <Sprite src={boss.sprite} alt={label ?? boss.name} size={48} />
      <span className="line-clamp-2 text-[10px] leading-tight text-slate-300">{label ?? boss.name}</span>
    </button>
  );
}
