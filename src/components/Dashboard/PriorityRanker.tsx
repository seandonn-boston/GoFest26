"use client";

import { useMemo } from "react";
import { getBoss } from "@/data";
import { usePlannerStore, selectedInPriorityOrder } from "@/store/usePlannerStore";
import { Sprite } from "@/components/ui/Sprite";

/**
 * Lets the user rank which species matter most. Priority drives bar fill order
 * and — when goals overflow a block's capacity — which raids get greyed out
 * first (lowest priority is cut first). Hidden until two+ species are selected.
 */
export function PriorityRanker() {
  const inputs = usePlannerStore((s) => s.inputs);
  const priorityOrder = usePlannerStore((s) => s.priorityOrder);
  const reprioritize = usePlannerStore((s) => s.reprioritize);
  const order = useMemo(() => selectedInPriorityOrder({ inputs, priorityOrder }), [inputs, priorityOrder]);

  if (order.length < 2) return null;

  const arrow =
    "flex h-6 w-6 items-center justify-center rounded-sm border border-white/15 bg-gofest-bg/50 text-slate-300 disabled:opacity-25 active:translate-y-px";

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Priority order</h3>
        <span className="text-[10px] text-slate-500">Highest first · lowest is cut first when over budget</span>
      </div>
      <ol className="space-y-1.5">
        {order.map((id, i) => {
          const boss = getBoss(id);
          if (!boss) return null;
          return (
            <li
              key={id}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-gofest-bg/40 px-2 py-1.5"
            >
              <span className="w-4 text-center font-mono text-xs text-slate-500">{i + 1}</span>
              <Sprite src={boss.sprite} alt={boss.name} size={24} />
              <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{boss.name}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Move ${boss.name} up`}
                  className={arrow}
                  disabled={i === 0}
                  onClick={() => reprioritize(id, "up")}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${boss.name} down`}
                  className={arrow}
                  disabled={i === order.length - 1}
                  onClick={() => reprioritize(id, "down")}
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
