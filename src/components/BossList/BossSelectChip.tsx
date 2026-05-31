"use client";

import type { RaidBoss } from "@/domain/types";
import { TierBadge } from "@/components/ui/Badge";

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
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition ${
        selected
          ? "border-gofest-accent2 bg-gofest-accent2/15 text-white"
          : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25"
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
          selected ? "border-gofest-accent2 bg-gofest-accent2 text-gofest-bg" : "border-white/30"
        }`}
      >
        {selected ? "✓" : ""}
      </span>
      <span className="font-medium">{label ?? boss.name}</span>
      <TierBadge tier={boss.tier} />
    </button>
  );
}
