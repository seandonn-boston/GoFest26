"use client";

import { usePlannerStore } from "@/store/usePlannerStore";
import type { RemotePlan, WeekendBlockPlan } from "@/domain";
import { PlusToggle } from "@/components/ui/PlusToggle";
import { useExpandable } from "@/hooks/useExpandable";
import { BandBar } from "@/components/ui/BandBar";
import { RaidCountersMegas } from "@/components/ui/CountersMegasRow";
import { RemoteAllocator } from "./RemoteAllocator";
import { RemoteWindows } from "./RemoteWindows";

/**
 * Remote-raid section: the opt-in checkbox (disabled until a value is entered),
 * the assigned passes as a bar, then the per-species allocation inputs. Lives on
 * its own step (Remote Prioritizer) — moved off the GO Fest weekend step.
 */
function RemoteSection({ remote }: { remote?: RemotePlan }) {
  const [open, setOpen] = useExpandable(true);
  const useRemote = usePlannerStore((s) => s.settings.useRemoteRaids);
  const setSettings = usePlannerStore((s) => s.setSettings);
  const setRemoteAuto = usePlannerStore((s) => s.setRemoteAuto);
  // Remote raids assigned across selected species — drives the disabled state.
  const assigned = usePlannerStore((s) => {
    let n = 0;
    for (const id in s.remoteAllocations) if (s.inputs[id]?.selected) n += Math.max(0, s.remoteAllocations[id] || 0);
    return n;
  });
  const hasAllocations = assigned > 0;
  const on = useRemote && hasAllocations;
  const fitted = remote?.fitted ?? 0;
  const over = !!remote && remote.remaining > 0;
  // Bosses actually being raided remotely (a raid fits) → their counters + megas.
  const remoteBossIds = (remote?.species ?? []).filter((s) => s.fitted > 0).map((s) => s.formeBossId ?? s.bossId);

  const toggle = (checked: boolean) => {
    setSettings({ useRemoteRaids: checked });
    if (checked) setRemoteAuto(false);
  };

  return (
    <div className="rounded-lg border border-sky-400/30 bg-sky-400/[0.04] px-2.5 py-2">
      {/* Opt-in at the very top. Disabled until a remote value is entered in the
          allocator below — entering one auto-enables and checks this. */}
      <label
        className={`flex items-center gap-2 text-xs font-medium ${
          hasAllocations ? "cursor-pointer text-slate-200" : "cursor-not-allowed text-slate-500"
        }`}
      >
        <input
          type="checkbox"
          className="h-4 w-4 accent-sky-400 disabled:opacity-40"
          checked={on}
          disabled={!hasAllocations}
          onChange={(e) => toggle(e.target.checked)}
        />
        I&apos;ll do remote raids
        {!hasAllocations ? (
          <span className="text-[11px] font-normal text-slate-500">— enter a number below to turn on</span>
        ) : null}
      </label>

      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-2 w-full text-left">
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
          <span className="inline-flex items-center font-medium text-sky-400">Assign per species</span>
          <span className="flex shrink-0 items-center gap-1.5">
            {on ? (
              <span className={over ? "text-rose-300" : "text-slate-400"}>
                {fitted} to do{over ? ` · ${remote!.remaining} beyond your remote time` : ""}
              </span>
            ) : null}
            <PlusToggle open={open} size={11} className="text-sky-400" />
          </span>
        </div>
        {on && remote ? <BandBar bands={remote.bands} fitted={fitted} capacityMax={remote.capacity} /> : null}
      </button>
      {open ? <RemoteAllocator /> : null}
      {/* Best counters + megas for the species you're actually raiding remotely —
          only when at least one remote raid is allocated (hidden at zero). */}
      {on && remoteBossIds.length > 0 ? (
        <div className="mt-2">
          <RaidCountersMegas bossIds={remoteBossIds} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Step 5 — Remote raids. Opt in and assign how many of each target to do
 * remotely; they stack on top of the in-person plan (blocks never change).
 */
export function RemotePrioritizer({ plan }: { plan: WeekendBlockPlan }) {
  const anySelected = usePlannerStore((s) => Object.values(s.inputs).some((i) => i.selected));
  const remote = plan.remote && plan.remote.species.length > 0 ? plan.remote : undefined;
  if (!anySelected) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Remote raids</h2>
        <p className="mt-1 text-sm text-slate-400">
          Remote Raid Passes are unlimited this event. Assign how many of each target you&apos;ll do remotely — they add on
          top of your in-person plan (the GO Fest time blocks don&apos;t change). Auto-balance covers region-locked targets
          first, then fills each goal&apos;s remaining gap until your planned passes run out.
        </p>
      </div>
      <RemoteSection remote={remote} />
      <RemoteWindows />
    </section>
  );
}
