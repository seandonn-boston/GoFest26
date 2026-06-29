"use client";

import type { MegaBoost, MegaKind } from "@/domain";
import { Sprite } from "./Sprite";

// Sprite outline colours encode three signals a mega has for a boss / hour-block:
// boss-type match (B), wild-spawn-type match (W), good attacker (A). Combinations
// stack into the metal tiers; single signals are the plain colours.
//   rainbow  B+W+A   silver  B+A     boss   B only (purple)   attacker  A only (grey)
//   gold     B+W     bronze  W+A     wild   W only (blue)
// Rainbow is an animated conic-gradient ring (see .mega-rainbow in globals.css);
// the rest are solid 2px rings.
export const MEGA_KIND_RING: Record<MegaKind, string> = {
  rainbow: "mega-rainbow",
  gold: "ring-2 ring-[#f5b301]",
  silver: "ring-2 ring-[#cbd5e1]",
  bronze: "ring-2 ring-[#cd7f32]",
  boss: "ring-2 ring-purple-400",
  wild: "ring-2 ring-sky-400",
  attacker: "ring-2 ring-slate-400",
};

/** The same kinds as plain CSS hex, for tinting text / legend dots. */
export const MEGA_KIND_COLOR: Record<MegaKind, string> = {
  rainbow: "#e879f9",
  gold: "#f5b301",
  silver: "#cbd5e1",
  bronze: "#cd7f32",
  boss: "#c084fc", // purple-400
  wild: "#38bdf8", // sky-400
  attacker: "#94a3b8", // slate-400
};

export const MEGA_KIND_LABEL: Record<MegaKind, string> = {
  rainbow: "boss type + wild spawn + attacker",
  gold: "boss type + wild spawn",
  silver: "boss type + attacker",
  bronze: "wild spawn + attacker",
  boss: "boss type match",
  wild: "wild-spawn type match",
  attacker: "attacker only (no type match)",
};

const RAINBOW_GRADIENT =
  "conic-gradient(from 0deg, #ff0040, #ff8a00, #ffe600, #14e07a, #00b3ff, #7a5cff, #ff00c8, #ff0040)";

/** A rank-ordered row of mega-evolution candy-boost sprites with kind outlines. */
export function MegaBoostRow({ boosts, size = 26, max }: { boosts: MegaBoost[]; size?: number; max?: number }) {
  const shown = typeof max === "number" ? boosts.slice(0, max) : boosts;
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((b) => (
        <span
          key={b.mega.name}
          title={`${b.mega.name} (${b.mega.types.join("/")}) — ${MEGA_KIND_LABEL[b.kind]}`}
          className={`inline-flex rounded-full bg-black/30 ${MEGA_KIND_RING[b.kind]}`}
        >
          <Sprite src={b.mega.sprite} alt={b.mega.name} size={size} />
        </span>
      ))}
    </div>
  );
}

const LEGEND: { kind: MegaKind; label: string }[] = [
  { kind: "rainbow", label: "boss+wild+atk" },
  { kind: "gold", label: "boss+wild" },
  { kind: "silver", label: "boss+atk" },
  { kind: "bronze", label: "wild+atk" },
  { kind: "boss", label: "boss" },
  { kind: "wild", label: "wild" },
  { kind: "attacker", label: "atk only" },
];

/** Compact key explaining the outline colours. */
export function MegaBoostLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
      {LEGEND.map((l) => (
        <span key={l.kind} className="inline-flex items-center gap-1">
          <Dot kind={l.kind} />
          {l.label}
        </span>
      ))}
    </div>
  );
}

function Dot({ kind }: { kind: MegaKind }) {
  if (kind === "rainbow") {
    return (
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: RAINBOW_GRADIENT }}
        aria-hidden
      />
    );
  }
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full bg-black/40"
      style={{ boxShadow: `inset 0 0 0 2px ${MEGA_KIND_COLOR[kind]}` }}
      aria-hidden
    />
  );
}
