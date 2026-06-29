"use client";

import { getBoss } from "@/data";
import { bossIsLocal } from "@/domain/region";
import { usePlannerStore } from "@/store/usePlannerStore";

/**
 * Opt-in for Remote Raids. GO Fest 2026 lifts the daily remote-pass limit, so the
 * only real constraint is how many Remote Raid Passes the user has — entered on
 * the resources step (step 2), along with Link Charges, which are a standalone
 * item handled there rather than tied to this toggle.
 */
export function RemoteRaidToggle() {
  const on = usePlannerStore((s) => s.settings.useRemoteRaids);
  const planned = usePlannerStore((s) => s.settings.remoteRaidPassesPlanned);
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

  const budget = Math.max(0, Math.round(planned ?? 0));

  function toggle(checked: boolean) {
    setSettings({ useRemoteRaids: checked });
    // Opting in starts in MANUAL mode: leave allocations at 0 so the user assigns
    // them; the per-species "Auto-balance" button fills by priority.
    if (checked) setRemoteAuto(false);
  }

  return (
    <div className="mt-4 rounded-lg border border-gofest-accent/30 bg-gofest-accent/[0.05] p-2.5">
      <label className="flex items-center gap-2 text-xs font-medium text-slate-200">
        <input type="checkbox" className="h-4 w-4 accent-gofest-accent" checked={on} onChange={(e) => toggle(e.target.checked)} />
        I&apos;ll do remote raids
      </label>

      {on ? (
        <>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">
            Remote passes are <b className="text-slate-200">unlimited</b> this event — the only limit is how many you
            have, which you enter on the resources step. You&apos;ve assigned{" "}
            <span className="font-mono text-slate-300">{assigned}</span> so far
            {assigned > budget ? <span className="text-rose-300"> — {assigned - budget} over your {budget}</span> : null}.
            Region-locked targets are filled first, then your priority order. A remote{" "}
            <b className="text-slate-200">Super Mega</b> (Mewtwo) raid also needs 200 Link Charges per raid — set those on
            the resources step.
          </p>
          <p className="mt-1.5 rounded-sm border border-gofest-acid/30 bg-gofest-acid/[0.06] p-2 text-[13px] leading-relaxed text-gofest-acid">
            💤 Don&apos;t raid all night — play Pokémon Sleep instead <span className="not-italic">;)</span>
          </p>
        </>
      ) : hasRemoteOnly ? (
        <p className="mt-1.5 text-[13px] text-gofest-accent">
          ⚠ You&apos;ve picked region-locked targets — they can only be done remotely. Turn this on to plan them.
        </p>
      ) : (
        <p className="mt-1.5 text-[13px] text-slate-500">
          Unlimited this event. Each species you assign remotely drops out of its in-person time block.
        </p>
      )}
    </div>
  );
}
