"use client";

import type { ReactNode } from "react";
import { GAME_CONFIG } from "@/data/config";
import { usePlannerStore } from "@/store/usePlannerStore";
import { MathTooltip } from "@/components/ui/MathTooltip";

const numField =
  "w-16 rounded-sm border border-white/15 bg-gofest-bg/60 px-1 py-0.5 text-center font-mono text-sm text-slate-100 outline-none focus:border-gofest-accent2";

/** A small ⓘ that opens the supplemental explanation, keeping the input row itself
 *  to just a label + field. */
function Info({ children }: { children: ReactNode }) {
  return (
    <MathTooltip
      label="More info"
      trigger={
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/25 text-[9px] font-bold leading-none text-slate-400 transition hover:border-white/50 hover:text-slate-200">
          i
        </span>
      }
    >
      <p className="text-[11px] leading-relaxed text-slate-300">{children}</p>
    </MathTooltip>
  );
}

/**
 * The passes you already hold, entered at the top of the results so the
 * have / need / buy split below (PassCoverage, PassEconomy) reflects them. Free
 * daily passes aren't entered here — they're granted automatically and already
 * counted. Each input is just a label + field; the detail lives in the ⓘ tooltip.
 */
export function PlanPasses() {
  const passesOwned = usePlannerStore((s) => s.settings.passesOwned ?? 0);
  const useRemote = usePlannerStore((s) => s.settings.useRemoteRaids);
  const remotePlanned = usePlannerStore((s) => s.settings.remoteRaidPassesPlanned ?? 0);
  const setSettings = usePlannerStore((s) => s.setSettings);

  const setNum = (key: "passesOwned" | "remoteRaidPassesPlanned") => (raw: string) => {
    const n = Math.round(Number(raw.replace(/[^\d]/g, "")) || 0);
    setSettings({ [key]: Math.max(0, Math.min(9999, n)) });
  };

  const free = GAME_CONFIG.passEconomy.freePassesPerWeekendDay;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-300">
      <label className="flex items-center gap-1.5">
        <span>Passes I have</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={String(Math.max(0, Math.round(passesOwned)))}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setNum("passesOwned")(e.target.value)}
          aria-label="Raid passes you already have"
          className={numField}
        />
        <Info>
          Premium / regular Raid Passes you already hold. We spend them on your{" "}
          <b className="text-slate-200">highest priorities first</b>; the breakdown below shows how many you have, need,
          and still have to buy. Free daily passes{free ? ` (${free}/day this weekend)` : ""} aren&apos;t entered here —
          they&apos;re granted automatically and already counted.
        </Info>
      </label>

      {useRemote ? (
        <label className="flex items-center gap-1.5">
          <span>Remote passes I have</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={String(Math.max(0, Math.round(remotePlanned)))}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setNum("remoteRaidPassesPlanned")(e.target.value)}
            aria-label="Remote Raid Passes you'll use"
            className={numField}
          />
          <Info>
            Remote Raid Passes are <b className="text-slate-200">unlimited</b> this event — the only limit is how many you
            hold. Region-locked targets are filled first, then your priority order.
          </Info>
        </label>
      ) : null}
    </div>
  );
}
