"use client";

import { useMemo } from "react";
import { getBoss, MEWTWO_X_ID, MEWTWO_Y_ID } from "@/data";
import { bossIsLocal } from "@/domain/region";
import { MAX_REMOTE_PER_SPECIES } from "@/domain/settings";
import { usePlannerStore, selectedInPriorityOrder } from "@/store/usePlannerStore";
import { Sprite } from "@/components/ui/Sprite";

const isMewtwo = (id: string) => id === MEWTWO_X_ID || id === MEWTWO_Y_ID;

/**
 * Per-species remote-raid allocation. The user types how many of each target to
 * do remotely; those raids drop out of the in-person time blocks. Each species is
 * capped at 50 (one day's bosses), Mewtwo at the full 60 (it's up both days), and
 * the running total can't exceed the 60-pass budget.
 */
export function RemoteAllocator() {
  const inputs = usePlannerStore((s) => s.inputs);
  const priorityOrder = usePlannerStore((s) => s.priorityOrder);
  const allocations = usePlannerStore((s) => s.remoteAllocations);
  const setRemoteAllocation = usePlannerStore((s) => s.setRemoteAllocation);
  const remoteAuto = usePlannerStore((s) => s.remoteAuto);
  const setRemoteAuto = usePlannerStore((s) => s.setRemoteAuto);
  const region = usePlannerStore((s) => s.settings.region);
  const budget = usePlannerStore((s) => s.settings.remoteRaidBudget);

  const order = useMemo(() => selectedInPriorityOrder({ inputs, priorityOrder }), [inputs, priorityOrder]);
  if (!order.length) return null;

  const total = order.reduce((s, id) => s + Math.max(0, allocations[id] ?? 0), 0);

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] text-slate-400">
          {remoteAuto
            ? "Auto-balanced by priority — drag the priority list and these re-flow. Edit any number to take over."
            : "Assign remote raids per species — the in-person blocks above drop to match."}{" "}
          <span className={total > budget ? "text-rose-300" : "text-slate-300"}>
            {total}/{budget}
          </span>{" "}
          used.
        </p>
        {remoteAuto ? (
          <span className="shrink-0 rounded-sm border border-gofest-accent2/40 bg-gofest-accent2/10 px-1.5 py-[1px] font-mono text-[9px] font-bold uppercase tracking-wider text-gofest-accent2">
            Auto
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setRemoteAuto(true)}
            title="Re-balance remote passes by priority"
            className="shrink-0 rounded-sm border border-white/15 bg-gofest-bg/60 px-1.5 py-[1px] font-mono text-[9px] font-bold uppercase tracking-wider text-slate-300 transition hover:border-gofest-accent2/50 hover:text-gofest-accent2"
          >
            ↻ Auto-balance
          </button>
        )}
      </div>
      {order.map((id) => {
        const boss = getBoss(id);
        if (!boss) return null;
        const val = Math.max(0, allocations[id] ?? 0);
        const speciesCap = isMewtwo(id) ? budget : Math.min(MAX_REMOTE_PER_SPECIES, budget);
        // Can't push this species past its cap, nor the running total past the budget.
        const max = Math.max(0, Math.min(speciesCap, val + (budget - total)));
        const remoteOnly = !bossIsLocal(boss, region);
        return (
          <div key={id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-gofest-bg/40 px-2 py-1.5">
            <Sprite src={boss.sprite} alt={boss.name} size={24} />
            <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{boss.name}</span>
            {remoteOnly ? (
              <span className="shrink-0 rounded-sm border border-gofest-accent/50 bg-gofest-accent/15 px-1 py-[1px] font-mono text-[8px] font-extrabold uppercase tracking-wider text-gofest-accent">
                Remote
              </span>
            ) : null}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={String(val)}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value.replace(/[^\d]/g, "")) || 0);
                setRemoteAllocation(id, Math.max(0, Math.min(max, n)));
              }}
              aria-label={`Remote raids for ${boss.name}`}
              className="w-12 shrink-0 rounded-sm border border-white/15 bg-gofest-bg/60 px-1 py-0.5 text-center font-mono text-sm text-slate-100 outline-none focus:border-gofest-accent"
            />
          </div>
        );
      })}
    </div>
  );
}
