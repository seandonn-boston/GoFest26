"use client";

import { getBoss } from "@/data";
import { bossIsLocal } from "@/domain/region";
import { usePlannerStore } from "@/store/usePlannerStore";

/**
 * Opt-in for Remote Raids. GO Fest 2026 lifts the daily remote-pass limit, so
 * the only real constraint is how many Remote Raid Passes the user has — entered
 * directly. Also collects Link Charges (how many they hold + whether they intend
 * to use them), which changes the PokéCoin pass economy.
 */
export function RemoteRaidToggle() {
  const on = usePlannerStore((s) => s.settings.useRemoteRaids);
  const planned = usePlannerStore((s) => s.settings.remoteRaidPassesPlanned);
  const linkChargesOwned = usePlannerStore((s) => s.settings.linkChargesOwned);
  const useLinkCharges = usePlannerStore((s) => s.settings.useLinkCharges);
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

  const setNum = (key: "remoteRaidPassesPlanned" | "linkChargesOwned") => (raw: string) => {
    const n = Math.round(Number(raw.replace(/[^\d]/g, "")) || 0);
    setSettings({ [key]: Math.max(0, n) } as Partial<{ remoteRaidPassesPlanned: number; linkChargesOwned: number }>);
  };

  return (
    <div className="mt-4 rounded-lg border border-gofest-accent/30 bg-gofest-accent/[0.05] p-2.5">
      <label className="flex items-center gap-2 text-xs font-medium text-slate-200">
        <input type="checkbox" className="h-4 w-4 accent-gofest-accent" checked={on} onChange={(e) => toggle(e.target.checked)} />
        I&apos;ll do remote raids
      </label>

      {on ? (
        <>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
            Remote passes are <b className="text-slate-200">unlimited</b> this event — the only limit is how many you
            have, which you enter on the results step. You&apos;ve assigned{" "}
            <span className="font-mono text-slate-300">{assigned}</span> so far
            {assigned > budget ? <span className="text-rose-300"> — {assigned - budget} over your {budget}</span> : null}.
            Region-locked targets are filled first, then your priority order.
          </p>
          <p className="mt-1.5 rounded-sm border border-gofest-acid/30 bg-gofest-acid/[0.06] p-2 text-[11px] leading-relaxed text-gofest-acid">
            💤 Don&apos;t raid all night — play Pokémon Sleep instead <span className="not-italic">;)</span>
          </p>

          {/* Link Charges — used for remote Super Mega (mandatory 200) and,
              optionally, in-person Mega / Super Mega raids. */}
          <div className="mt-3 rounded-md border border-purple-300/25 bg-purple-300/[0.05] p-2">
            <label className="flex items-center gap-2 text-xs font-medium text-purple-200">
              <input
                type="checkbox"
                className="h-4 w-4 accent-purple-400"
                checked={useLinkCharges}
                onChange={(e) => setSettings({ useLinkCharges: e.target.checked })}
              />
              I&apos;ll use Link Charges on Mega / Super Mega raids
            </label>
            <label className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <span>Link Charges I have</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={String(Math.max(0, Math.round(linkChargesOwned ?? 0)))}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setNum("linkChargesOwned")(e.target.value)}
                aria-label="Link Charges you have"
                className="w-20 rounded-sm border border-purple-300/40 bg-gofest-bg/60 px-1 py-0.5 text-center font-mono text-sm text-slate-100 outline-none focus:border-purple-300"
              />
            </label>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
              A remote Super Mega raid needs a Remote Pass <b className="text-slate-300">and</b> 200 Link Charges. Opting in
              also spends spare Link Charges on in-person Megas (150 each) — the cheapest way to free up passes for other
              raids. Buy LC at 200 for 100 coins or 600 for 250.
            </p>
          </div>
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
