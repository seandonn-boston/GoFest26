"use client";

import { useMemo } from "react";
import { getBoss } from "@/data";
import { bossIsLocal } from "@/domain/region";
import { groupDisplayName } from "@/domain/forms";
import { usePlannerStore, selectedInGlobalOrder } from "@/store/usePlannerStore";
import { Sprite } from "@/components/ui/Sprite";

/**
 * Per-species remote-raid allocation. The user types how many of each target to
 * do remotely; those raids drop out of the in-person time blocks. Remote passes
 * are unlimited this event, so there's no per-species cap — the time budget (how
 * many fit your waking hours) is shown above. Auto-balance fills region-locked
 * targets first, then by priority.
 */
export function RemoteAllocator() {
  const inputs = usePlannerStore((s) => s.inputs);
  const blockPriority = usePlannerStore((s) => s.blockPriority);
  const allocations = usePlannerStore((s) => s.remoteAllocations);
  const setRemoteAllocation = usePlannerStore((s) => s.setRemoteAllocation);
  const remoteAuto = usePlannerStore((s) => s.remoteAuto);
  const setRemoteAuto = usePlannerStore((s) => s.setRemoteAuto);
  const setSettings = usePlannerStore((s) => s.setSettings);
  const region = usePlannerStore((s) => s.settings.region);

  const order = useMemo(() => selectedInGlobalOrder({ inputs, blockPriority }), [inputs, blockPriority]);
  if (!order.length) return null;

  const total = order.reduce((s, id) => s + Math.max(0, allocations[id] ?? 0), 0);

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] text-slate-400">
          {remoteAuto
            ? "Auto-balanced by priority (region-locked first) — drag the priority list and these re-flow. Edit any number to take over."
            : "Assign remote raids per species — the in-person blocks above drop to match."}{" "}
          <span className="text-slate-300">{total}</span> total.
        </p>
        {remoteAuto ? (
          <span className="shrink-0 rounded-sm border border-gofest-accent2/40 bg-gofest-accent2/10 px-1.5 py-[1px] font-mono text-[11px] font-bold uppercase tracking-wider text-gofest-accent2">
            Auto
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              // Auto-balancing also opts into remote raids (and checks the box).
              setSettings({ useRemoteRaids: true });
              setRemoteAuto(true);
            }}
            title="Re-fill region-locked first, then by priority"
            className="shrink-0 rounded-sm border border-white/15 bg-gofest-bg/60 px-1.5 py-[1px] font-mono text-[11px] font-bold uppercase tracking-wider text-slate-300 transition hover:border-gofest-accent2/50 hover:text-gofest-accent2"
          >
            ↻ Auto-balance
          </button>
        )}
      </div>
      {order.map((id) => {
        const boss = getBoss(id);
        if (!boss) return null;
        const val = Math.max(0, allocations[id] ?? 0);
        const remoteOnly = !bossIsLocal(boss, region);
        const label = groupDisplayName(boss);
        return (
          <div key={id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-gofest-bg/40 px-2 py-1.5">
            <Sprite src={boss.sprite} alt={boss.name} size={24} />
            <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{label}</span>
            {remoteOnly ? (
              <span className="shrink-0 rounded-sm border border-gofest-accent/50 bg-gofest-accent/15 px-1 py-[1px] font-mono text-[10px] font-extrabold uppercase tracking-wider text-gofest-accent">
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
                setRemoteAllocation(id, Math.max(0, n));
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
