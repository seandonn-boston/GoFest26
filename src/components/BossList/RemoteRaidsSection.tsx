"use client";

import { useEffect, useMemo, useState } from "react";
import { RAID_BOSSES } from "@/data";
import { bossIsLocal, regionScopeLabel } from "@/domain/region";
import { remoteWindowsForBoss, type RemoteWindow } from "@/domain/remoteWindows";
import { usePlannerStore } from "@/store/usePlannerStore";
import { BossSelectChip } from "./BossSelectChip";

/** "Sat 9:00 PM" in the device's own timezone. */
function fmt(utcMs: number): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }).format(utcMs);
}

/** One availability window: the anchor-city recommendation in the player's own
 *  clock (bold), with what's happening on the host region's clock under it. */
function WindowLine({ w, mounted }: { w: RemoteWindow; mounted: boolean }) {
  return (
    <li className="rounded-md border border-white/10 bg-gofest-bg/40 px-2 py-1 text-[12px] leading-snug">
      {mounted ? (
        <span className="font-semibold text-cyan-200">
          {fmt(w.anchorStartUtc)} – {fmt(w.anchorEndUtc)}
          <span className="ml-1.5 font-normal text-slate-500">your time · {w.anchorCity}</span>
        </span>
      ) : (
        <span className="text-slate-500">Local times load on your device…</span>
      )}
      <div className="text-slate-400">Their {w.hostLabel}</div>
    </li>
  );
}

/**
 * Remote-raid selection (Step 1): the targets that are NOT raidable in the
 * player's own region, pulled out of the habitat / Road of Legends sections so
 * every remote decision lives in one place. Each tile comes with the days and
 * times the boss is actually live — the host region's windows anchored to a
 * major city with a big GO community (Tokyo, Berlin, New York, …), converted to
 * the player's clock. Times render only after mount: they depend on the device
 * timezone, which the static prerender can't know.
 */
export function RemoteRaidsSection() {
  const region = usePlannerStore((s) => s.settings.region);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const targets = useMemo(
    () =>
      RAID_BOSSES.filter((b) => b.region && !bossIsLocal(b, region))
        .map((boss) => ({ boss, windows: remoteWindowsForBoss(boss) ?? [] }))
        .filter((t) => t.windows.length > 0),
    [region],
  );

  if (targets.length === 0) return null;

  return (
    <section className="mb-5 rounded-lg border border-cyan-400/25 bg-cyan-400/[0.04] p-3">
      <h3 className="text-sm font-semibold text-cyan-300">🕑 Remote raids · not raidable in {region.label}</h3>
      <p className="mb-3 mt-1 text-[13px] text-slate-400">
        These need a{" "}
        <span className="rounded-sm bg-gofest-accent px-1 py-[1px] font-mono text-[11px] font-extrabold uppercase text-black">
          Remote
        </span>{" "}
        Raid Pass (capped per day) and only spawn while their home region&apos;s windows are live — shown here in{" "}
        <b>your time</b>, anchored to a major-GO-community city there.
      </p>
      <div className="space-y-3">
        {targets.map(({ boss, windows }) => (
          <div key={boss.id} className="flex items-start gap-3">
            <BossSelectChip boss={boss} remoteOnly />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {regionScopeLabel(boss.region)}
              </div>
              <ul className="mt-1 space-y-1">
                {windows.map((w) => (
                  <WindowLine key={w.hostLabel} w={w} mounted={mounted} />
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
