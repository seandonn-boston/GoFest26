"use client";

import { useMemo } from "react";
import { computePassCost } from "@/domain";
import type { PlanSummary } from "@/domain/types";
import { usePlannerStore } from "@/store/usePlannerStore";
import { PassCoverageSummary } from "./PassCoverage";

const coins = (n: number) => `${Math.round(n).toLocaleString()}`;

function Row({ label, detail, value }: { label: string; detail?: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5 text-xs">
      <span className="min-w-0 text-slate-300">
        {label}
        {detail ? <span className="ml-1 text-slate-500">{detail}</span> : null}
      </span>
      <span className="shrink-0 font-mono text-slate-200">{value}</span>
    </div>
  );
}

/**
 * PokéCoin cost to OWN the raid passes a plan needs, as a lowest–highest range.
 * Free Orange daily passes are applied first (so playing more Road-of-Legends
 * weekdays lowers the bill); the paid remainder is Premium ("green") passes for
 * in-person raids, Remote ("blue") passes for remote raids, plus 800 Link
 * Charges for every *remote* Super Mega (Mewtwo) raid. Prices live in
 * GAME_CONFIG.passEconomy. Sits at the bottom of the dashboard.
 */
export function PassEconomy({ summary }: { summary: PlanSummary }) {
  const inputs = usePlannerStore((s) => s.inputs);
  const settings = usePlannerStore((s) => s.settings);
  const remoteAllocations = usePlannerStore((s) => s.remoteAllocations);
  const playDays = usePlannerStore((s) => s.playDays);

  const cost = useMemo(
    () => computePassCost(Object.values(inputs), summary.results, settings, remoteAllocations, playDays),
    [inputs, summary.results, settings, remoteAllocations, playDays],
  );

  if (summary.totalRaids.max <= 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-amber-300/25 bg-amber-300/[0.04] p-3">
      <h3 className="text-sm font-semibold text-amber-200">Passes &amp; cost</h3>

      {/* Have / need / buy, allocated by priority — then the PokéCoin cost. */}
      <div className="mt-2">
        <PassCoverageSummary summary={summary} />
      </div>

      <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-200/80">
        PokéCoin cost · all passes after free dailies
      </h4>

      {!cost.hasCost ? (
        <p className="mt-1 text-xs text-emerald-300">
          ✓ Your {cost.freePasses} free daily passes cover the whole plan — <b>0 coins</b>.
        </p>
      ) : (
        <>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold text-amber-200">
              {coins(cost.low.total)}–{coins(cost.high.total)}
            </span>
            <span className="text-[11px] text-slate-400">coins to own the passes your goals need</span>
          </div>

          <div className="mt-2 divide-y divide-white/[0.04] rounded-md border border-white/10 bg-gofest-bg/30 px-2.5 py-1.5">
            <Row
              label="Free daily passes used"
              detail={`of ${cost.freePasses} (9/day + ${cost.weekdaysPlayed} weekday${cost.weekdaysPlayed === 1 ? "" : "s"})`}
              value={`${cost.freePassesUsed}`}
            />
            {cost.paidInPerson > 0 ? (
              <Row
                label="Paid in-person (Premium)"
                detail={`${cost.paidInPerson} pass${cost.paidInPerson === 1 ? "" : "es"}`}
                value={`${coins(cost.low.greenCoins)}–${coins(cost.high.greenCoins)}`}
              />
            ) : null}
            {cost.totalRemote > 0 ? (
              <Row
                label="Remote passes"
                detail={`${cost.totalRemote} pass${cost.totalRemote === 1 ? "" : "es"}`}
                value={`${coins(cost.low.remoteCoins)}–${coins(cost.high.remoteCoins)}`}
              />
            ) : null}
            {cost.linkChargesNeeded > 0 ? (
              <Row
                label="Link Charges to buy"
                detail={`${cost.linkChargesNeeded.toLocaleString()} LC · ${cost.remoteSuperMegaRaids} remote Super Mega raid${cost.remoteSuperMegaRaids === 1 ? "" : "s"} (200 LC ea)`}
                value={`${coins(cost.high.linkChargeCoins)}`}
              />
            ) : null}
            {cost.passesSavedByLinkCharges > 0 ? (
              <Row
                label="Passes covered by your Link Charges"
                detail="in-person Megas (150 LC) / Super Megas (200 LC)"
                value={`−${cost.passesSavedByLinkCharges}`}
              />
            ) : null}
          </div>

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Method title="Lowest" tone="text-emerald-300" methods={cost.low.methods} total={cost.low.total} />
            <Method title="Highest" tone="text-rose-300" methods={cost.high.methods} total={cost.high.total} />
          </div>
        </>
      )}

      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        Singles excluded (3-pack+ only). A <b>remote</b> Super Mega (Mewtwo) raid needs a Remote Pass <b>and</b> 200 Link
        Charges; in person, Link Charges can stand in for a Mega (150) / Super Mega (200) pass when you opt in. Box prices
        are personalized &amp; vary — the “lowest” uses a best-case bulk box estimate (editable). Assumes a free daily pass
        can enter an in-person Super Mega Raid.
      </p>
    </div>
  );
}

function Method({ title, tone, methods, total }: { title: string; tone: string; methods: string[]; total: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-gofest-bg/30 p-2">
      <div className="mb-1 flex items-baseline justify-between">
        <span className={`text-[11px] font-bold uppercase tracking-wide ${tone}`}>{title}</span>
        <span className="font-mono text-xs font-bold text-slate-200">{coins(total)}</span>
      </div>
      <ul className="space-y-0.5 text-[11px] text-slate-400">
        {methods.map((m, i) => (
          <li key={i}>• {m}</li>
        ))}
      </ul>
    </div>
  );
}
