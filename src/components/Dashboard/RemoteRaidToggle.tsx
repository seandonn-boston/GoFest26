"use client";

import { getBoss } from "@/data";
import { bossIsLocal } from "@/domain/region";
import { MIN_HEALTHY_SLEEP_HOURS } from "@/domain/settings";
import { midpoint } from "@/lib/math";
import type { CapacityModel } from "@/domain/types";
import { usePlannerStore } from "@/store/usePlannerStore";

/**
 * Opt-in for Remote Raids. GO Fest 2026 lifts the daily remote-pass limit, so
 * remote raids are UNLIMITED in count — the only constraint is the time the user
 * has outside the in-person event and sleep. So instead of a pass budget, the
 * user sets how much they sleep, which sizes the remote-raid time window.
 */
export function RemoteRaidToggle({ capacity }: { capacity: CapacityModel }) {
  const on = usePlannerStore((s) => s.settings.useRemoteRaids);
  const sleep = usePlannerStore((s) => s.settings.sleepHoursPerNight);
  const setSettings = usePlannerStore((s) => s.setSettings);
  const setRemoteAuto = usePlannerStore((s) => s.setRemoteAuto);
  const assigned = usePlannerStore((s) => {
    let n = 0;
    for (const id in s.remoteAllocations) {
      if (s.inputs[id]?.selected) n += Math.max(0, s.remoteAllocations[id] || 0);
    }
    return n;
  });
  const hasRemoteOnly = usePlannerStore((s) => {
    for (const id in s.inputs) {
      if (!s.inputs[id].selected) continue;
      const boss = getBoss(id);
      if (boss && !bossIsLocal(boss, s.settings.region)) return true;
    }
    return false;
  });

  const capRaids = Math.round(midpoint(capacity.remoteCapacity));
  const lowSleep = sleep < MIN_HEALTHY_SLEEP_HOURS;

  function toggle(checked: boolean) {
    setSettings({ useRemoteRaids: checked });
    // Opting in starts in MANUAL mode: leave allocations at 0 so the user assigns
    // them; the per-species "Auto-balance" button fills by priority.
    if (checked) setRemoteAuto(false);
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
            <span>Sleep / night</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={String(sleep)}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value.replace(/[^\d]/g, "")) || 0);
                setSettings({ sleepHoursPerNight: Math.max(0, Math.min(16, n)) });
              }}
              aria-label="Hours of sleep per night"
              className="w-12 rounded-sm border border-gofest-accent/40 bg-gofest-bg/60 px-1 py-0.5 text-center font-mono text-sm text-slate-100 outline-none focus:border-gofest-accent"
            />
            <span>hrs</span>
          </label>
        ) : null}
      </div>

      {on ? (
        <>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
            Remote passes are <b className="text-slate-200">unlimited</b> this event — the limit is your time.
            With {sleep}h sleep you have ~<span className="font-mono text-slate-200">{capacity.remoteHoursPerDay}h</span>/day
            outside the event, ≈ <span className="font-mono text-slate-200">{capRaids}</span> remote raids over the weekend.
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            <span className="font-mono text-slate-300">{assigned}</span> remote raids assigned below
            {assigned > capRaids ? (
              <span className="text-rose-300"> — {assigned - capRaids} more than fit your remote time</span>
            ) : null}
            . Region-locked targets are filled first, then your priority order.
          </p>
          {lowSleep ? (
            <p className="mt-1.5 rounded-sm border border-rose-400/40 bg-rose-500/10 p-2 text-[10px] leading-relaxed text-rose-200">
              ⚠ {sleep}h of sleep is ill-advised for a GO Fest weekend — it&apos;s two full days of walking and time in
              the sun. Consider at least {MIN_HEALTHY_SLEEP_HOURS} hours.
            </p>
          ) : null}
        </>
      ) : hasRemoteOnly ? (
        <p className="mt-1.5 text-[11px] text-gofest-accent">
          ⚠ You&apos;ve picked region-locked targets — they can only be done remotely. Turn this on to plan them.
        </p>
      ) : (
        <p className="mt-1.5 text-[11px] text-slate-500">
          Unlimited this event. Each species you assign remotely drops out of its in-person time block.
        </p>
      )}
    </div>
  );
}
