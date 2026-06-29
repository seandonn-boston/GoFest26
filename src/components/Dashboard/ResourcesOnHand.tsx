"use client";

import { useState, type ReactNode } from "react";
import { usePlannerStore } from "@/store/usePlannerStore";
import { MathTooltip } from "@/components/ui/MathTooltip";
import { PlusToggle } from "@/components/ui/PlusToggle";

const numField =
  "w-16 rounded-sm border border-white/15 bg-gofest-bg/60 px-1 py-0.5 text-center font-mono text-sm text-slate-100 outline-none focus:border-gofest-accent2";

/** Small ⓘ popover so each input row stays just a label + field. */
function Info({ children }: { children: ReactNode }) {
  return (
    <MathTooltip
      label="More info"
      hideIcon
      trigger={
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/25 text-[11px] font-bold leading-none text-slate-400 transition hover:border-white/50 hover:text-slate-200">
          i
        </span>
      }
    >
      <p className="text-[13px] leading-relaxed text-slate-300">{children}</p>
    </MathTooltip>
  );
}

/**
 * "What you've already got" — the raid passes, remote passes and Link Charges on
 * hand. This lives at the top of step 2 (your current position) so the cost
 * breakdown later can show have / need / buy. Link Charges are a STANDALONE item
 * (not tied to remote raids): in person they pay for Mega (150) and Super Mega
 * (200) raids; for remote they only enable Super Mega raids (a Remote Pass + 200
 * LC) — they do nothing for ordinary remote Mega raids.
 */
export function ResourcesOnHand() {
  const passesOwned = usePlannerStore((s) => s.settings.passesOwned ?? 0);
  const remotePlanned = usePlannerStore((s) => s.settings.remoteRaidPassesPlanned ?? 0);
  const linkChargesOwned = usePlannerStore((s) => s.settings.linkChargesOwned ?? 0);
  const useLinkCharges = usePlannerStore((s) => s.settings.useLinkCharges);
  const setSettings = usePlannerStore((s) => s.setSettings);

  const [open, setOpen] = useState(false);

  const setNum =
    (key: "passesOwned" | "remoteRaidPassesPlanned" | "linkChargesOwned") => (raw: string) => {
      const n = Math.round(Number(raw.replace(/[^\d]/g, "")) || 0);
      setSettings({ [key]: Math.max(0, Math.min(99999, n)) });
    };

  return (
    <div className="rounded-xl border border-white/10 bg-gofest-panel/40 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <h3 className="text-sm font-semibold text-slate-100">Passes &amp; Link Charges on hand</h3>
        <PlusToggle open={open} size={16} className="shrink-0 text-slate-400" />
      </button>
      {open ? (
        <>
      <p className="mt-1.5 text-[13px] text-slate-400">
        What you already hold — we spend it on your highest priorities first, so the cost step shows
        only what you&apos;d still buy. Free daily passes are auto-counted, so leave those out.
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs text-slate-300">
        <label className="flex items-center gap-1.5">
          <span>Raid Passes</span>
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
            Premium / regular Raid Passes you hold for <b className="text-slate-200">in-person</b> raids. Free daily
            passes aren&apos;t entered here — they&apos;re granted automatically and already counted.
          </Info>
        </label>

        <label className="flex items-center gap-1.5">
          <span>Remote Raid Passes</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={String(Math.max(0, Math.round(remotePlanned)))}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setNum("remoteRaidPassesPlanned")(e.target.value)}
            aria-label="Remote Raid Passes you have"
            className={numField}
          />
          <Info>
            Remote Raid Passes are <b className="text-slate-200">unlimited</b> this event — this is just how many you
            plan on using through the week. They&apos;re only used if you opt into remote raids on the Prioritize step.
          </Info>
        </label>

        <label className="flex items-center gap-1.5">
          <span>Link Charges</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={String(Math.max(0, Math.round(linkChargesOwned)))}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setNum("linkChargesOwned")(e.target.value)}
            aria-label="Link Charges you have"
            className={numField}
          />
          <Info>
            A standalone currency — <b className="text-slate-200">in person</b> they pay for a Mega (150 LC) or Super
            Mega (200 LC) raid instead of a pass. For <b className="text-slate-200">remote</b> they only enable a Super
            Mega raid (a Remote Pass <b>and</b> 200 LC); they don&apos;t help ordinary remote Mega raids. Buy at 200 for
            100 coins or 600 for 250.
          </Info>
        </label>
      </div>

      {/* Standalone opt-in — NOT tied to remote raids. */}
      <label className="mt-2.5 flex items-start gap-2 text-[13px] text-slate-300">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-purple-400"
          checked={useLinkCharges}
          onChange={(e) => setSettings({ useLinkCharges: e.target.checked })}
        />
        <span>
          Spend my Link Charges on <b className="text-purple-200">in-person Mega / Super Mega</b> raids — the cheapest
          way to free up passes. {linkChargesOwned <= 0 ? <span className="text-slate-500">(Add some above first.)</span> : null}
        </span>
      </label>
        </>
      ) : null}
    </div>
  );
}
