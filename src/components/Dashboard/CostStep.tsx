"use client";

import type { PlanSummary } from "@/domain/types";
import { Disclosure } from "@/components/ui/Disclosure";
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
    <section>
      <h2 className="mb-1 text-lg font-semibold">What it&apos;ll cost</h2>
      <p className="mb-3 text-sm text-slate-400">
        Passes you already hold are spent on your highest priorities first; everything below is the
        remainder you&apos;d buy and what it runs in PokéCoins.
      </p>

      {hasGoals ? (
        <div className="space-y-3">
          <Disclosure title={<span className="font-semibold text-slate-200">Passes</span>} defaultOpen>
            <PassCoverageBar summary={summary} />
          </Disclosure>
          <Disclosure title={<span className="font-semibold text-slate-200">Cost</span>} defaultOpen>
            <PassEconomy summary={summary} />
          </Disclosure>
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          Pick targets and enter what you hold on the earlier steps to see the pass cost.
        </p>
      )}
    </section>
  );
}
