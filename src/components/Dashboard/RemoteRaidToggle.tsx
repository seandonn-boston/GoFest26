"use client";

import { getBoss } from "@/data";
import { bossIsLocal } from "@/domain/region";
import { MAX_REMOTE_RAIDS } from "@/domain/settings";
import { usePlannerStore } from "@/store/usePlannerStore";

/**
 * Opt-in for Remote Raid Passes: a separate budget of up to 60 raids (≈Fri 10 +
 * Sat&Sun 40 + Mon 10 by time zone) that isn't bound to the habitat time blocks.
 * When on, the per-species allocation list appears beneath the remote bar; the
 * total here is just the running sum of those assignments. Sits above the blocks.
 */
export function RemoteRaidToggle() {
  const on = usePlannerStore((s) => s.settings.useRemoteRaids);
  const setSettings = usePlannerStore((s) => s.setSettings);
  // Running total of the per-species remote allocations (for selected bosses).
  const allocated = usePlannerStore((s) => {
    let n = 0;
    for (const id in s.remoteAllocations) {
      if (s.inputs[id]?.selected) n += Math.max(0, s.remoteAllocations[id] || 0);
    }
    return Math.min(MAX_REMOTE_RAIDS, n);
  });
  // Any selected target that can't be raided in person (region-locked)?
  const hasRemoteOnly = usePlannerStore((s) => {
    for (const id in s.inputs) {
      if (!s.inputs[id].selected) continue;
      const boss = getBoss(id);
      if (boss && !bossIsLocal(boss, s.settings.region)) return true;
    }
    return false;
  });

  return (
    <div className="mt-4 rounded-lg border border-gofest-accent/30 bg-gofest-accent/[0.05] p-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-200">
          <input
            type="checkbox"
            className="h-4 w-4 accent-gofest-accent"
            checked={on}
            onChange={(e) => setSettings({ useRemoteRaids: e.target.checked })}
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
          <span className="font-mono text-slate-400">Fri* 10 · Sat &amp; Sun** 40 · Mon* 10</span>
          <br />
          *time-zone dependent, and only the adjacent day&apos;s bosses (Fri → Sat raids, Mon → Sun raids).{" "}
          **Sat &amp; Sun can pull either day&apos;s bosses. Assign them per species below the remote bar.
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
