"use client";

import type { ReactNode } from "react";
import { getBoss } from "@/data";
import { usePlannerStore } from "@/store/usePlannerStore";
import { computeBossResult, explainCurrency } from "@/domain";
import type { Currency } from "@/domain/types";
import { MathTooltip } from "./MathTooltip";
import { ExplainEquation } from "./ExplainEquation";

const CURRENCY_ORDER: Currency[] = ["megaEnergy", "xlCandy", "candy"];

/**
 * Wraps a "raids needed" number with a click-to-open / click-to-dismiss tooltip
 * that shows the exact engine calculation behind it — every currency that drives
 * the raid count, binding one first — reusing the same editable ExplainEquation
 * the boss card uses. Falls back to plain children when nothing can be explained
 * (e.g. a target already met, or a shared-pool species the tile can't reproduce).
 */
export function RaidsNeededTooltip({
  bossId,
  label = "How this raid count is calculated",
  hideIcon = true,
  children,
}: {
  bossId: string;
  label?: string;
  hideIcon?: boolean;
  children: ReactNode;
}) {
  const input = usePlannerStore((s) => s.inputs[bossId]);
  const calibration = usePlannerStore((s) => s.settings.calibration);
  const megaBuddyLevel = usePlannerStore((s) => s.settings.megaBuddyLevel);

  const boss = getBoss(bossId);
  if (!boss || !input) return <>{children}</>;

  const result = computeBossResult(boss, input, calibration, megaBuddyLevel);
  const explanations = CURRENCY_ORDER.filter((c) => result.needs[c])
    .map((c) => explainCurrency(boss, input, c, calibration, megaBuddyLevel))
    .filter((e): e is NonNullable<typeof e> => !!e);
  if (!explanations.length) return <>{children}</>;

  return (
    <MathTooltip label={label} hideIcon={hideIcon} trigger={<span className="cursor-help">{children}</span>}>
      <div className="space-y-3">
        {explanations.map((ex) => (
          <ExplainEquation key={ex.currency} bossId={bossId} explanation={ex} />
        ))}
      </div>
    </MathTooltip>
  );
}
