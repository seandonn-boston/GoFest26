"use client";

import type { PlanSummary } from "@/domain/types";
import { Card } from "@/components/ui/Card";
import { PassCoverageBar } from "./PassCoverage";
import { PassEconomy } from "./PassEconomy";

/**
 * Step 5 — Cost. The money side of the plan, pulled out of the results so the
 * Results step stays focused on what to raid: how many passes you have vs. need
 * (priority-ordered), and the PokéCoin bill to own the rest after free dailies.
 */
export function CostStep({ summary }: { summary: PlanSummary }) {
  const hasGoals = summary.totalRaids.max > 0;
  return (
    <Card className="p-4">
      <h2 className="mb-1 text-lg font-semibold">What it&apos;ll cost</h2>
      <p className="mb-3 text-sm text-slate-400">
        Passes you already hold are spent on your highest priorities first; everything below is the
        remainder you&apos;d buy and what it runs in PokéCoins.
      </p>

      {hasGoals ? (
        <>
          <PassCoverageBar summary={summary} />
          <PassEconomy summary={summary} />
        </>
      ) : (
        <p className="text-sm text-slate-400">
          Pick targets and enter what you hold on the earlier steps to see the pass cost.
        </p>
      )}
    </Card>
  );
}
