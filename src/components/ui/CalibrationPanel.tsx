"use client";

import { GAME_CONFIG } from "@/data/config";
import type { CalibrationMetric } from "@/domain/settings";
import type { Range } from "@/domain/types";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Disclosure } from "./Disclosure";

const { megaRewards, catch: catchRewards } = GAME_CONFIG;

const METRICS: { key: CalibrationMetric; label: string; assumed: Range; hint: string }[] = [
  { key: "superMegaEnergy", label: "Mega Energy / Super Mega raid", assumed: megaRewards.superMega, hint: "Mewtwo X & Y" },
  { key: "megaEnergy", label: "Mega Energy / Mega raid", assumed: megaRewards.mega, hint: "regular Megas" },
  { key: "legendaryXl", label: "Candy XL / legendary catch", assumed: catchRewards.legendaryXl, hint: "5★ & Mewtwo" },
  { key: "megaXl", label: "Candy XL / Mega catch", assumed: catchRewards.megaXl, hint: "Megas" },
];

const range = (r: Range) => (r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`);

/**
 * "Calibrate to your luck" — log what you actually got per raid for the four
 * highest-impact (and most uncertain) reward metrics. A logged value overrides
 * the assumed range with your real rate, tightening every raid count that
 * depends on it. Collapsed by default; clearing a field reverts to the estimate.
 */
export function CalibrationPanel() {
  const calibration = usePlannerStore((s) => s.settings.calibration);
  const setCalibration = usePlannerStore((s) => s.setCalibration);
  const activeCount = Object.values(calibration).filter((v) => v && v > 0).length;

  return (
    <Disclosure
      title="Calibrate to your luck"
      hint={
        <span className="text-[10px] text-slate-500">
          {activeCount > 0 ? `${activeCount} logged` : "use observed drops"}
        </span>
      }
    >
      <div className="space-y-2">
        <p className="text-[10px] leading-snug text-slate-500">
          Enter what you&apos;re actually getting per raid and the plan uses your rate instead of the estimate. Leave blank
          to keep the assumed range. Energy is read off the bar after a raid; Candy XL from the catch reward.
        </p>
        {METRICS.map((m) => {
          const v = calibration[m.key];
          return (
            <div key={m.key} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-slate-200">{m.label}</div>
                <div className="text-[10px] text-slate-500">
                  {m.hint} · assumed {range(m.assumed)}
                </div>
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={v ?? ""}
                placeholder={range(m.assumed)}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setCalibration(m.key, Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
                aria-label={`Observed ${m.label}`}
                className={`w-16 rounded-sm border bg-gofest-bg/60 px-2 py-1 text-center text-slate-100 outline-none focus:border-gofest-accent2 ${
                  v && v > 0 ? "border-gofest-accent2/60" : "border-white/15"
                }`}
              />
            </div>
          );
        })}
      </div>
    </Disclosure>
  );
}
