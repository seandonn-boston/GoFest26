"use client";

import { useEffect, useMemo, useState } from "react";
import { getBoss, RAID_BOSSES } from "@/data";
import { bossIsLocal } from "@/domain/region";
import { remoteWindowsForBoss, type RemoteWindow } from "@/domain/remoteWindows";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Sprite } from "@/components/ui/Sprite";

/** "Sat 9:00 PM" in the device's own timezone. */
function fmt(utcMs: number): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }).format(utcMs);
}

function WindowRow({ w }: { w: RemoteWindow }) {
  return (
    <div className="rounded-md border border-white/10 bg-gofest-bg/40 px-2 py-1.5 text-[13px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="font-semibold text-gofest-accent2">
          {fmt(w.anchorStartUtc)} – {fmt(w.anchorEndUtc)}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-slate-500">your time · {w.anchorCity} window</span>
      </div>
      <div className="mt-0.5 text-[12px] text-slate-400">
        Their {w.hostLabel} · flexible anywhere in {w.regionLabel}: {fmt(w.startUtc)} – {fmt(w.endUtc)}
      </div>
    </div>
  );
}

/**
 * WHEN to do the remote raids: every selected region-locked target's windows,
 * translated from the HOST region's clock into the player's own. The bold range
 * is the anchor-city recommendation (dense raid population mid-region); the
 * "flexible" range is the full span during which the block is live somewhere in
 * that region. Times render only after mount — they depend on the device
 * timezone, which the static prerender can't know.
 */
export function RemoteWindows() {
  const region = usePlannerStore((s) => s.settings.region);
  const selectedIds = usePlannerStore((s) => {
    const out: string[] = [];
    for (const id in s.inputs) if (s.inputs[id].selected) out.push(id);
    return out.join(",");
  });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const targets = useMemo(() => {
    const ids = new Set(selectedIds.split(",").filter(Boolean));
    return RAID_BOSSES.filter((b) => ids.has(b.id) && !bossIsLocal(b, region))
      .map((b) => ({ boss: b, windows: remoteWindowsForBoss(b) }))
      .filter((t): t is { boss: (typeof RAID_BOSSES)[number]; windows: RemoteWindow[] } => !!t.windows?.length);
  }, [selectedIds, region]);

  if (!mounted || targets.length === 0) return null;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="rounded-lg border border-cyan-400/25 bg-cyan-400/[0.04] px-2.5 py-2">
      <h3 className="text-sm font-semibold text-cyan-300">🕑 When to raid remotely</h3>
      <p className="mb-2 mt-1 text-[13px] text-slate-400">
        Event windows run on the <b>host region&apos;s</b> clock — a block in Japan happens during your{" "}
        {tz.includes("America") ? "night" : "off-hours"}. These are your region-locked targets&apos; windows in{" "}
        <b>your time</b> ({tz.replace(/_/g, " ")}). Line up friends or Campfire invites for the bold window.
      </p>
      <div className="space-y-3">
        {targets.map(({ boss, windows }) => (
          <div key={boss.id}>
            <div className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-slate-200">
              <Sprite src={getBoss(boss.id)?.sprite} alt={boss.name} size={20} />
              {boss.name}
              <span className="text-[11px] uppercase tracking-wide text-slate-500">{windows[0].regionLabel}</span>
            </div>
            <div className="space-y-1">
              {windows.map((w) => (
                <WindowRow key={w.hostLabel} w={w} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
