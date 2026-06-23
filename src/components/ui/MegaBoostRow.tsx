"use client";

import type { MegaBoost, MegaKind } from "@/domain";
import { Sprite } from "./Sprite";

// Sprite outline colors echo the Mega Energy glyph: purple = the mega is also a
// super-effective attacker, blue = it also boosts the hour's featured wild
// spawns, none = it only boosts this boss's candy.
export const MEGA_KIND_RING: Record<MegaKind, string> = {
  attacker: "ring-purple-400",
  wild: "ring-sky-400",
  boss: "ring-white/15",
};

/** The same kind colors as plain CSS hex, for tinting text (not just rings). */
export const MEGA_KIND_COLOR: Record<MegaKind, string> = {
  attacker: "#c084fc", // purple-400
  wild: "#38bdf8", // sky-400
  boss: "#cbd5e1", // slate-300
};

export const MEGA_KIND_LABEL: Record<MegaKind, string> = {
  attacker: "also a super-effective attacker",
  wild: "also boosts the hour's wild spawns",
  boss: "candy boost for this boss",
};

/** A rank-ordered row of mega-evolution candy-boost sprites with kind outlines. */
export function MegaBoostRow({ boosts, size = 26, max }: { boosts: MegaBoost[]; size?: number; max?: number }) {
  const shown = typeof max === "number" ? boosts.slice(0, max) : boosts;
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((b) => (
        <span
          key={b.mega.name}
          title={`${b.mega.name} (${b.mega.types.join("/")}) — ${MEGA_KIND_LABEL[b.kind]}`}
          className={`inline-flex rounded-full bg-black/30 ring-2 ${MEGA_KIND_RING[b.kind]}`}
        >
          <Sprite src={b.mega.sprite} alt={b.mega.name} size={size} />
        </span>
      ))}
    </div>
  );
}

/** Compact key explaining the outline colors. */
export function MegaBoostLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9px] text-slate-400">
      <Dot ring="ring-purple-400" /> attacker
      <Dot ring="ring-sky-400" /> wild boost
      <Dot ring="ring-white/15" /> boss only
    </div>
  );
}

function Dot({ ring }: { ring: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full bg-black/40 ring-2 ${ring}`} aria-hidden />;
}
