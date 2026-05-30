import type { ReactNode } from "react";
import type { RaidTier } from "@/domain/types";

const TIER_STYLES: Record<RaidTier, string> = {
  "super-mega": "bg-gofest-mewtwo/20 text-purple-200 border-purple-400/40",
  mega: "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/30",
  "five-star": "bg-amber-500/15 text-amber-200 border-amber-400/30",
  regional: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
};

const TIER_LABELS: Record<RaidTier, string> = {
  "super-mega": "Super Mega",
  mega: "Mega",
  "five-star": "5★",
  regional: "Regional",
};

export function TierBadge({ tier }: { tier: RaidTier }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${TIER_STYLES[tier]}`}>
      {TIER_LABELS[tier]}
    </span>
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-300 ${className}`}
    >
      {children}
    </span>
  );
}
