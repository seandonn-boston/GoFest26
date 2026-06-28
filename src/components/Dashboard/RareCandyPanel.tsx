"use client";

import type { WeekendBlockPlan } from "@/domain";
import { rareCandyForecast } from "@/domain";
import { usePlannerStore } from "@/store/usePlannerStore";
import { NumberInput } from "@/components/ui/NumberInput";

/**
 * Rare Candy summary — what you already hold plus what these raids will net you,
 * for the flexible Rare Candy / Rare Candy XL pools you can spend on any species.
 * Sits above the weekend-capacity gauge on the results page.
 */
export function RareCandyPanel({ plan }: { plan: WeekendBlockPlan }) {
  const have = usePlannerStore((s) => s.settings.rareCandyOwned ?? 0);
  const haveXl = usePlannerStore((s) => s.settings.rareCandyXlOwned ?? 0);
  const setSettings = usePlannerStore((s) => s.setSettings);
  const bonus = rareCandyForecast(plan);

  return (
    <div className="mb-4 rounded-lg border border-amber-300/25 bg-amber-300/[0.05] p-2.5">
      <div className="mb-2 text-[13px] uppercase tracking-wide text-amber-200/80">Rare Candy</div>

      <div className="grid grid-cols-2 gap-2">
        <NumberInput
          label="Current Rare Candy"
          value={have}
          onChange={(v) => setSettings({ rareCandyOwned: Math.max(0, Math.round(v)) })}
        />
        <NumberInput
          label="Current Rare XL Candy"
          value={haveXl}
          onChange={(v) => setSettings({ rareCandyXlOwned: Math.max(0, Math.round(v)) })}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
        <span>
          <span className="text-slate-400">From these raids</span>{" "}
          <span className="font-bold text-amber-200">≈{bonus.rareCandy}</span>{" "}
          <span className="text-slate-300">Rare Candy</span> ·{" "}
          <span className="font-bold text-amber-200">≈{bonus.rareCandyXl}</span>{" "}
          <span className="text-slate-300">XL</span>
        </span>
        <span className="text-slate-400">
          → total ≈<span className="font-bold text-amber-200">{have + bonus.rareCandy}</span> /{" "}
          <span className="font-bold text-amber-200">{haveXl + bonus.rareCandyXl}</span> XL
        </span>
      </div>

      <p className="mt-1 text-[12px] text-slate-500">
        ~1 Rare Candy per raid, plus 1 Rare Candy XL per 5★ &amp; Mega Mewtwo raid (not regular Megas) — spend it on any
        species.
      </p>
    </div>
  );
}
