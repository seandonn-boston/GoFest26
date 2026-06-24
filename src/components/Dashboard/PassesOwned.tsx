"use client";

import { usePlannerStore } from "@/store/usePlannerStore";

/**
 * "How many raid passes do you already have?" — sits above the remote-raid
 * opt-in. The number is spent on the highest-priority targets first (see
 * PassCoverage on the results step), so owned passes cover what matters most and
 * the rest is what you'd still buy. Doesn't change the plan, only the have/need/buy split.
 */
export function PassesOwned() {
  const passesOwned = usePlannerStore((s) => s.settings.passesOwned ?? 0);
  const setSettings = usePlannerStore((s) => s.setSettings);

  return (
    <div className="mt-4 rounded-lg border border-gofest-accent2/30 bg-gofest-accent2/[0.05] p-2.5">
      <label className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-slate-200">
        <span>Raid passes you already have</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={String(passesOwned)}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const n = Math.round(Number(e.target.value.replace(/[^\d]/g, "")) || 0);
            setSettings({ passesOwned: Math.max(0, Math.min(9999, n)) });
          }}
          aria-label="Raid passes you already have"
          className="w-16 rounded-sm border border-gofest-accent2/40 bg-gofest-bg/60 px-1 py-0.5 text-center font-mono text-sm text-slate-100 outline-none focus:border-gofest-accent2"
        />
      </label>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
        We&apos;ll spend these on your <b className="text-slate-200">highest priorities first</b>. The results show how
        many you have, how many you need, and how many more to buy — without dropping a lower-priority goal ahead of a
        more important one.
      </p>
    </div>
  );
}
