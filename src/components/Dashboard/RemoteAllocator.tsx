"use client";

import { useMemo } from "react";
import { getBoss } from "@/data";
import { bossIsLocal } from "@/domain/region";
import { groupDisplayName } from "@/domain/forms";
import { usePlannerStore, selectedInRosterOrder } from "@/store/usePlannerStore";
import { Sprite } from "@/components/ui/Sprite";
import { PixelIcon } from "@/components/ui/PixelIcon";

/**
 * Per-species remote-raid allocation, listed in selection-screen (roster) order.
 * Remote raids stack ON TOP of the in-person plan — assigning them never changes
 * the GO Fest time blocks. Auto-balance spends the planned passes on region-
 * locked targets first (remote is their only path), then tops up each goal the
 * in-person plan can't finish, until the passes run out or every goal is met.
 */
export function RemoteAllocator() {
  const inputs = usePlannerStore((s) => s.inputs);
  const allocations = usePlannerStore((s) => s.remoteAllocations);
  const setRemoteAllocation = usePlannerStore((s) => s.setRemoteAllocation);
  const remoteAuto = usePlannerStore((s) => s.remoteAuto);
  const setRemoteAuto = usePlannerStore((s) => s.setRemoteAuto);
  const setSettings = usePlannerStore((s) => s.setSettings);
  const region = usePlannerStore((s) => s.settings.region);
  const planned = usePlannerStore((s) => Math.max(0, Math.round(s.settings.remoteRaidPassesPlanned ?? 0)));

  const order = useMemo(() => selectedInRosterOrder(inputs), [inputs]);
  if (!order.length) return null;

  const total = order.reduce((s, id) => s + Math.max(0, allocations[id] ?? 0), 0);
  const left = planned - total;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] text-slate-400">
          {remoteAuto
            ? "Auto-balanced: region-locked targets first, then each goal's remaining gap. Edit any number to take over."
            : "Assign remote raids per target — they add on top of your in-person plan (the GO Fest blocks don't change)."}
        </p>
        <button
          type="button"
          onClick={() => {
            // Auto-balancing also opts into remote raids (and checks the box).
            setSettings({ useRemoteRaids: true });
            setRemoteAuto(true);
          }}
          disabled={remoteAuto}
          title="Spend your planned passes: region-locked targets first, then each goal's remaining gap, until passes run out"
          className={`shrink-0 rounded-sm border px-1.5 py-[1px] font-mono text-[11px] font-bold uppercase tracking-wider transition ${
            remoteAuto
              ? "border-sky-400/40 bg-sky-400/10 text-sky-400"
              : "border-white/15 bg-gofest-bg/60 text-slate-300 hover:border-sky-400/50 hover:text-sky-400"
          }`}
        >
          {remoteAuto ? "Auto ✓" : "↻ Auto-balance"}
        </button>
      </div>

      {/* Balance summary — planned passes (editable) vs. assigned vs. left. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-sky-400/25 bg-sky-400/[0.06] px-2.5 py-1.5 text-[13px]">
        <span className="flex items-center gap-1.5 text-slate-300">
          <PixelIcon name="globe" size={12} className="text-sky-400" />
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={String(planned)}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value.replace(/[^\d]/g, "")) || 0);
              setSettings({ remoteRaidPassesPlanned: Math.max(0, n) });
            }}
            aria-label="Remote passes you plan to use"
            className="w-14 rounded-sm border border-white/15 bg-gofest-bg/60 px-1 py-0.5 text-center font-mono text-sm text-slate-100 outline-none focus:border-sky-400"
          />
          passes planned
        </span>
        <span className="font-mono font-bold text-sky-300">{total} assigned</span>
        <span className={`font-mono ${left < 0 ? "font-bold text-rose-300" : "text-slate-400"}`}>
          {left < 0 ? `${-left} over your plan` : `${left} left to assign`}
        </span>
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
              <span className="shrink-0 rounded-sm border border-sky-400/50 bg-sky-400/15 px-1 py-[1px] font-mono text-[10px] font-extrabold uppercase tracking-wider text-sky-400">
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
              className="w-12 shrink-0 rounded-sm border border-white/15 bg-gofest-bg/60 px-1 py-0.5 text-center font-mono text-sm text-slate-100 outline-none focus:border-sky-400"
            />
          </div>
        );
      })}
    </div>
  );
}
