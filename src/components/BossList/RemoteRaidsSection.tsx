"use client";

import { useEffect, useMemo, useState } from "react";
import { RAID_BOSSES } from "@/data";
import { bossIsLocal, isScopeLocal, regionScopeLabel } from "@/domain/region";
import { remoteWindowsForBoss, type RemoteWindow } from "@/domain/remoteWindows";
import { usePlannerStore } from "@/store/usePlannerStore";
import { PlusToggle } from "@/components/ui/PlusToggle";
import { useExpandable } from "@/hooks/useExpandable";
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
        <span className="font-semibold text-sky-200">
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
 * Remote-raid selection (Step 1, collapsible — starts closed): every target
 * worth pointing a Remote Raid Pass at from the player's region, so the whole
 * remote decision lives in one place.
 *
 *  Region-locked bosses (incl. the Lake trio — Uxie APAC / Mesprit EMEA / Azelf
 *  Americas) aren't raidable here at all, so their tiles are pulled out of the
 *  habitat / Road of Legends sections and live here instead. (`boostRegion` is
 *  still supported for any "boosted elsewhere, raidable locally" boss.)
 *
 * Each tile comes with the days and times the boss is live — the host region's
 * windows anchored to a major city with a big GO community (Tokyo, Berlin,
 * New York, …), converted to the player's clock. Times render only after mount:
 * they depend on the device timezone, which the static prerender can't know.
 */
export function RemoteRaidsSection() {
  const region = usePlannerStore((s) => s.settings.region);
  const [open, setOpen] = useExpandable(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const targets = useMemo(
    () =>
      RAID_BOSSES.filter(
        (b) => (b.region && !bossIsLocal(b, region)) || (b.boostRegion && !isScopeLocal(b.boostRegion, region)),
      )
        .map((boss) => ({ boss, windows: remoteWindowsForBoss(boss) ?? [], exclusive: !!boss.region }))
        .filter((t) => t.windows.length > 0),
    [region],
  );

  if (targets.length === 0) return null;

  return (
    <section className="mb-5 rounded-lg border border-sky-400/25 bg-sky-400/[0.04]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-1.5 p-3 text-left"
      >
        <h3 className="text-sm font-semibold text-sky-300">
          🕑 Remote raids · {targets.length} targets worth remoting from {region.label}
        </h3>
        <PlusToggle open={open} size={15} className="shrink-0 text-sky-300" />
      </button>

      {open ? (
        <div className="px-3 pb-3">
          <p className="mb-3 text-[13px] text-slate-400">
            <span className="rounded-sm bg-sky-400 px-1 py-[1px] font-mono text-[11px] font-extrabold uppercase text-black">
              Remote
            </span>{" "}
            = region-locked, so you raid it remotely while its home region&apos;s window is live — shown in <b>your time</b>,
            anchored to a major-GO-community city there.
          </p>
          <div className="space-y-3">
            {targets.map(({ boss, windows, exclusive }) => (
              <div key={boss.id} className="flex items-start gap-3">
                <BossSelectChip boss={boss} remoteOnly={exclusive} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {regionScopeLabel(boss.region ?? boss.boostRegion)}
                    {exclusive ? null : <span className="ml-1.5 text-sky-300/80">boosted there · raidable here too</span>}
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
        </div>
      ) : null}
    </section>
  );
}
