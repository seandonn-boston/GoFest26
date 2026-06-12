"use client";

import { getBoss } from "@/data";
import { bossIsLocal } from "@/domain/region";
import { MAX_REMOTE_RAIDS } from "@/domain/settings";
import { usePlannerStore } from "@/store/usePlannerStore";

/**
 * Opt-in for Remote Raid Passes: a separate pool of up to 50 raids (≈20 Saturday
 * + 20 Sunday, plus Friday/Monday spillover by time zone) that isn't bound to the
 * habitat time blocks. When on, region-locked targets and any goals that ran out
 * of in-person time are filled from this pool by priority. Sits above the blocks.
 */
export function RemoteRaidToggle() {
  const on = usePlannerStore((s) => s.settings.useRemoteRaids);
  const count = usePlannerStore((s) => s.settings.remoteRaidCount);
  const setSettings = usePlannerStore((s) => s.setSettings);
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
          <label className="flex items-center gap-1.5 text-xs text-slate-400">
            How many?
            <input
              type="number"
              min={0}
              max={MAX_REMOTE_RAIDS}
              inputMode="numeric"
              value={count}
              onChange={(e) =>
                setSettings({ remoteRaidCount: Math.max(0, Math.min(MAX_REMOTE_RAIDS, Math.round(Number(e.target.value) || 0))) })
              }
              aria-label="Remote raids you plan to do"
              className="w-14 rounded-sm border border-white/15 bg-gofest-bg/60 px-1.5 py-0.5 text-center font-mono text-slate-100 outline-none focus:border-gofest-accent"
            />
            <span className="text-slate-500">/ {MAX_REMOTE_RAIDS}</span>
          </label>
        ) : null}
      </div>

      {on ? (
        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
          <span className="font-mono text-slate-400">Fri* 10 · Sat &amp; Sun** 40 · Mon* 10</span>
          <br />
          *time-zone dependent, and only the adjacent day&apos;s bosses (Fri → Sat raids, Mon → Sun raids).{" "}
          **Sat &amp; Sun can pull either day&apos;s bosses.
        </p>
      ) : null}
      {hasRemoteOnly && !on ? (
        <p className="mt-1.5 text-[11px] text-gofest-accent">
          ⚠ You&apos;ve picked region-locked targets — they can only be done remotely. Turn this on to plan them.
        </p>
      ) : (
        <p className="mt-1.5 text-[11px] text-slate-500">
          A separate pool that can raid any boss. Region-locked targets go here first (their only option), then it
          finishes goals that ran out of in-person time, then leftover passes top up Mewtwo.
        </p>
      )}
    </div>
  );
}
