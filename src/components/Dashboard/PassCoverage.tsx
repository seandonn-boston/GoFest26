"use client";

import type { PlanSummary } from "@/domain/types";
import type { PassCoverage as Coverage } from "@/domain";
import { usePassCoverage } from "@/hooks/usePlannerResults";
import { formatNumber, formatRange } from "@/lib/format";
import { getBoss } from "@/data";
import { Sprite } from "@/components/ui/Sprite";

/** Two-segment bar: emerald = raids your owned passes cover, amber = raids you'd
 *  still need to buy a pass for. Scaled to the worst-case total demand. */
function CoverageBar({ cov }: { cov: Coverage }) {
  const total = Math.max(cov.needed.max, cov.owned, 1);
  const coveredPct = Math.min(100, (cov.covered.max / total) * 100);
  const buyPct = Math.max(0, Math.min(100 - coveredPct, (cov.toBuy.max / total) * 100));
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-gofest-bg/60 ring-1 ring-white/10">
      <div
        className="h-full bg-emerald-400"
        style={{ width: `${coveredPct}%` }}
        title={`${cov.covered.max} raids covered by passes you have`}
      />
      <div
        className="h-full bg-amber-400"
        style={{ width: `${buyPct}%` }}
        title={`${formatRange(cov.toBuy)} raids you'd need to buy a pass for`}
      />
    </div>
  );
}

/** Compact owned-pass coverage bar — shown under the capacity gauge once the
 *  user has entered how many passes they hold. */
export function PassCoverageBar({ summary }: { summary: PlanSummary }) {
  const cov = usePassCoverage(summary);
  if (cov.owned <= 0 || cov.needed.max <= 0) return null;
  const enough = cov.toBuy.max <= 0;
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-baseline justify-between text-[13px]">
        <span className="text-slate-400">
          Passes you have: <b className="text-emerald-300">{cov.owned}</b>
        </span>
        <span className="text-slate-400">
          {enough ? (
            <span className="text-emerald-300">✓ covers every goal{cov.surplus > 0 ? ` · ${cov.surplus} spare` : ""}</span>
          ) : (
            <>
              buy <b className="text-amber-300">{formatRange(cov.toBuy)}</b> more
            </>
          )}
        </span>
      </div>
      <CoverageBar cov={cov} />
      <p className="mt-1 text-[12px] text-slate-500">
        Owned passes go to your highest priorities first; the amber portion is what you&apos;d still buy to cover every goal.
      </p>
    </div>
  );
}

/** Full have / need / buy summary with a per-target, priority-ordered breakdown —
 *  shown at the bottom of the results next to the PokéCoin pass economy. */
export function PassCoverageSummary({ summary }: { summary: PlanSummary }) {
  const cov = usePassCoverage(summary);
  if (cov.needed.max <= 0) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-gofest-bg/40 p-2.5">
      <div className="mb-2 grid grid-cols-3 gap-2 text-center">
        <Stat label="You have" value={String(cov.owned)} accent="text-emerald-300" />
        <Stat label="Need total" value={formatRange(cov.needed)} accent="text-slate-100" />
        <Stat
          label="To buy"
          value={cov.toBuy.max > 0 ? formatRange(cov.toBuy) : "0"}
          accent={cov.toBuy.max > 0 ? "text-amber-300" : "text-emerald-300"}
        />
      </div>

      {cov.owned > 0 ? <CoverageBar cov={cov} /> : null}

      <div className="mt-2 space-y-1">
        <div className="text-[12px] uppercase tracking-wide text-slate-500">By priority — your passes first</div>
        {cov.perSpecies.map((s) => {
          const boss = getBoss(s.bossId);
          const done = s.toBuy.max <= 0;
          return (
            <div key={s.bossId} className="flex items-center gap-2 text-[13px]">
              <Sprite src={boss?.sprite} alt={s.bossName} size={18} />
              <span className="min-w-0 flex-1 truncate text-slate-200">{s.bossName.replace(/^Mega /, "")}</span>
              <span className="shrink-0 text-slate-500">{formatNumber(s.covered)}/{formatRange(s.raids)}</span>
              <span className={`w-20 shrink-0 text-right ${done ? "text-emerald-300" : "text-amber-300"}`}>
                {done ? "✓ covered" : `buy ${formatRange(s.toBuy)}`}
              </span>
            </div>
          );
        })}
      </div>

      {cov.owned <= 0 ? (
        <p className="mt-2 text-[12px] text-slate-500">
          Tell us how many raid passes you already have on the <b>Enter what you have</b> step to see which goals they cover.
        </p>
      ) : null}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <div className="text-[12px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`text-lg font-bold ${accent}`}>{value}</div>
    </div>
  );
}
