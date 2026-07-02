import type { ReactNode } from "react";
import type { RaidTier } from "@/domain/types";

const TIER_STYLES: Record<RaidTier, string> = {
  "super-mega": "bg-gofest-mewtwo/20 text-gofest-mewtwo border-gofest-mewtwo/60",
  mega: "bg-gofest-accent/15 text-gofest-accent border-gofest-accent/50",
  "five-star": "bg-gofest-acid/15 text-gofest-acid border-gofest-acid/50",
  regional: "bg-gofest-accent2/15 text-gofest-accent2 border-gofest-accent2/50",
};

const TIER_LABELS: Record<RaidTier, string> = {
  "super-mega": "Super Mega",
  mega: "Mega",
  "five-star": "5★",
  regional: "Regional",
};

export function TierBadge({ tier }: { tier: RaidTier }) {
  return (
    <span
      className={`rounded-sm border px-1.5 py-0.5 font-mono text-[12px] font-bold uppercase tracking-widest ${TIER_STYLES[tier]}`}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`rounded-sm border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[12px] uppercase tracking-widest text-slate-300 ${className}`}
    >
      {children}
    </span>
  );
}
