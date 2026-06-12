"use client";

import { getBoss } from "@/data";
import { autoRemoteAllocations } from "@/domain";
import type { WeekendBlockPlan } from "@/domain";
import type { BossResult } from "@/domain/types";
import { bossIsLocal } from "@/domain/region";
import { MAX_REMOTE_RAIDS } from "@/domain/settings";
import { usePlannerStore } from "@/store/usePlannerStore";

/**
 * Opt-in for Remote Raid Passes: a budget of up to 60 raids (≈Fri 10 + Sat&Sun 40
 * + Mon 10 by time zone) separate from the habitat time blocks. Ticking it on
 * auto-assigns passes to the goals that can't be met in person (by priority); the
 * per-species list beneath the remote bar then lets the user fine-tune.
 */
export function RemoteRaidToggle({ blockPlan, results }: { blockPlan: WeekendBlockPlan; results: BossResult[] }) {
  const on = usePlannerStore((s) => s.settings.useRemoteRaids);
  const setSettings = usePlannerStore((s) => s.setSettings);
  const setRemoteAllocations = usePlannerStore((s) => s.setRemoteAllocations);
  const allocated = usePlannerStore((s) => {
    let n = 0;
    for (const id in s.remoteAllocations) {
      if (s.inputs[id]?.selected) n += Math.max(0, s.remoteAllocations[id] || 0);
    }
    return Math.min(MAX_REMOTE_RAIDS, n);
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
    // On first opt-in, auto-fill the unmet goals from the current (remote-off)
    // plan, by priority — the user can then adjust each below.
    if (checked && allocated === 0) {
      const { inputs, settings, priorityOrder } = usePlannerStore.getState();
      setRemoteAllocations(autoRemoteAllocations(blockPlan, Object.values(inputs), results, settings, priorityOrder));
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
          <span className="text-xs text-slate-400">
            <span className="font-mono text-slate-200">{allocated}</span> / {MAX_REMOTE_RAIDS} assigned
          </span>
        ) : null}
      </div>

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
