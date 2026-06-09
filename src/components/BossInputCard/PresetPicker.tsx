"use client";

import { PRESETS } from "@/data/presets";
import type { RaidBoss } from "@/domain/types";

export function PresetPicker({
  boss,
  activePresetId,
  onApply,
}: {
  boss: RaidBoss;
  activePresetId?: string;
  onApply: (presetId: string) => void;
}) {
  const isMega = boss.tier === "mega" || boss.tier === "super-mega";
  // Show mega presets for mega bosses, leveling presets for everything.
  const relevant = PRESETS.filter((p) => (p.kind === "mega" ? isMega : true));

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide text-slate-400">Quick presets</span>
      <div className="flex flex-wrap gap-1.5">
        {relevant.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.description}
            onClick={() => onApply(p.id)}
            className={`rounded-lg border px-2.5 py-1 text-xs transition outline-none focus-visible:ring-2 focus-visible:ring-gofest-accent2 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
              activePresetId === p.id
                ? "border-gofest-accent bg-gofest-accent/20 text-white"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
