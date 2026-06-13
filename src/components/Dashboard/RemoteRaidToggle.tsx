"use client";

import { getBoss } from "@/data";
import { autoRemoteAllocations } from "@/domain";
import type { WeekendBlockPlan } from "@/domain";
import type { BossResult } from "@/domain/types";
import { bossIsLocal } from "@/domain/region";
import { MAX_REMOTE_BUDGET } from "@/domain/settings";
import { usePlannerStore } from "@/store/usePlannerStore";

/**
 * Opt-in for Remote Raid Passes: a budget of up to 60 raids (≈Fri 10 + Sat&Sun 40
 * + Mon 10 by time zone) separate from the habitat time blocks. Ticking it on
 * auto-assigns passes to the goals that can't be met in person (by priority); the
 * per-species list beneath the remote bar then lets the user fine-tune.
 */
export function RemoteRaidToggle({ blockPlan, results }: { blockPlan: WeekendBlockPlan; results: BossResult[] }) {
  const on = usePlannerStore((s) => s.settings.useRemoteRaids);
  const budget = usePlannerStore((s) => s.settings.remoteRaidBudget);
  const setSettings = usePlannerStore((s) => s.setSettings);
  const setRemoteAllocations = usePlannerStore((s) => s.setRemoteAllocations);
  const setRemoteAuto = usePlannerStore((s) => s.setRemoteAuto);
  const allocated = usePlannerStore((s) => {
    let n = 0;
    for (const id in s.remoteAllocations) {
      if (s.inputs[id]?.selected) n += Math.max(0, s.remoteAllocations[id] || 0);
    }
    return Math.min(s.settings.remoteRaidBudget, n);
  });
  const hasRemoteOnly = usePlannerStore((s) => {
    for (const id in s.inputs) {
      if (!s.inputs[id].selected) continue;
      const boss = getBoss(id);
      if (boss && !bossIsLocal(boss, s.settings.region)) return true;
    }
    return false;
  });

  function toggle(checked: boolean) {
    setSettings({ useRemoteRaids: checked });
    if (checked) {
      // Opting in (re)starts priority-driven auto-balancing; the auto-balance
      // hook keeps it in sync from here. Seed it now so there's no empty frame.
      setRemoteAuto(true);
      if (allocated === 0) {
        const { inputs, settings, priorityOrder } = usePlannerStore.getState();
        setRemoteAllocations(autoRemoteAllocations(blockPlan, Object.values(inputs), results, settings, priorityOrder));
      }
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-gofest-accent/30 bg-gofest-accent/[0.05] p-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-200">
          <input
            type="checkbox"
            className="h-4 w-4 accent-gofest-accent"
            checked={on}
            onChange={(e) => toggle(e.target.checked)}
          />
          I&apos;ll do remote raids
        </label>
        {on ? (
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Passes to plan</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={String(budget)}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value.replace(/[^\d]/g, "")) || 0);
                setSettings({ remoteRaidBudget: Math.max(0, Math.min(MAX_REMOTE_BUDGET, n)) });
              }}
              aria-label="Total remote raid passes to plan"
              className="w-12 rounded-sm border border-gofest-accent/40 bg-gofest-bg/60 px-1 py-0.5 text-center font-mono text-sm text-slate-100 outline-none focus:border-gofest-accent"
            />
          </label>
        ) : null}
      </div>
      {on ? (
        <p className="mt-1 text-[11px] text-slate-500">
          <span className="font-mono text-slate-300">{allocated}</span> / {budget} passes assigned below.
        </p>
      ) : null}

      {on ? (
        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
          Auto-assigned to the goals that can&apos;t be met in person, by priority — tweak each below.{" "}
          <span className="font-mono text-slate-400">Fri* 10 · Sat &amp; Sun** 40 · Mon* 10</span>; *time-zone dependent,
          adjacent day only (Fri → Sat, Mon → Sun). **Sat &amp; Sun see either day.
        </p>
      ) : null}
      {hasRemoteOnly && !on ? (
        <p className="mt-1.5 text-[11px] text-gofest-accent">
          ⚠ You&apos;ve picked region-locked targets — they can only be done remotely. Turn this on to plan them.
        </p>
      ) : !on ? (
        <p className="mt-1.5 text-[11px] text-slate-500">
          A separate pool that can raid any boss. Each species drops out of its in-person time block by however
          many you assign to it remotely.
        </p>
      ) : null}
    </div>
  );
}
