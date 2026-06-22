"use client";

import { RISK_BANDS, type RiskBand } from "@/domain";

/** Confidence-band palette, shared by every capacity bar and legend. */
export const BAND_COLOR: Record<RiskBand, string> = {
  blue: "bg-sky-500",
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-rose-500",
};

export const BAND_LABEL: Record<RiskBand, string> = {
  blue: "Guaranteed",
  green: "Best case",
  yellow: "Average",
  red: "Worst case",
};

/**
 * Confidence-banded capacity bar. The bar IS the available capacity (100%):
 * raids that don't fit are never drawn — they're reported as the shortfall
 * beneath it. Segment hover titles name each band and its raid count.
 */
export function BandBar({
  bands,
  fitted,
  capacityMax,
  height = "h-3",
}: {
  bands: Record<RiskBand, number>;
  fitted: number;
  capacityMax: number;
  /** Tailwind height class — bars vary from h-2.5 (Road) to h-3 (blocks). */
  height?: string;
}) {
  const scale = Math.max(capacityMax, 1);
  const free = Math.max(0, capacityMax - fitted);
  const pct = (n: number) => `${(n / scale) * 100}%`;
  return (
    <div className={`flex w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-inset ring-white/10 ${height}`}>
      {RISK_BANDS.map((b) =>
        bands[b] > 0 ? (
          <div key={b} className={BAND_COLOR[b]} style={{ width: pct(bands[b]) }} title={`${BAND_LABEL[b]}: ${bands[b]}`} />
        ) : null,
      )}
      {free > 0 ? <div style={{ width: pct(free) }} /> : null}
    </div>
  );
}
