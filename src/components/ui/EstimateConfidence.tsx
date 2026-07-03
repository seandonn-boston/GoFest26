"use client";

import { ESTIMATE_NOTES, CONFIDENCE_META, type Confidence } from "@/data/estimateConfidence";
import type { CapacityModel } from "@/domain/types";
import { Disclosure } from "./Disclosure";

const ORDER: Confidence[] = ["verified", "community", "estimated"];

function Dot({ c }: { c: Confidence }) {
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${CONFIDENCE_META[c].dot}`} />;
}

/**
 * Collapsible "how accurate are these numbers?" panel — every load-bearing
 * estimate with its value, confidence tier, and source. Collapsed by default so
 * it adds transparency without cluttering the plan. When a `capacity` model is
 * passed, the "how capacity is calculated" breakdown leads the list (moved in
 * from the old GO-Fest step so all the transparency lives in one place).
 */
export function EstimateConfidence({ capacity, remotePool = 0 }: { capacity?: CapacityModel; remotePool?: number }) {
  return (
    <Disclosure
      title="How accurate are these numbers?"
      hint={
        <span className="flex items-center gap-2 text-[11px] text-slate-500">
          {ORDER.map((c) => (
            <span key={c} className="flex items-center gap-1">
              <Dot c={c} /> {CONFIDENCE_META[c].label}
            </span>
          ))}
        </span>
      }
    >
      {capacity ? (
        <div className="mb-3 rounded-md border border-white/10 bg-gofest-bg/30 p-2.5">
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-slate-400">
            How capacity is calculated
          </div>
          <p className="text-[13px] leading-snug text-slate-500">
            Capacity assumes {capacity.hoursPerDay}h/day × {capacity.days} days, a {capacity.lobbySize}-trainer lobby (~
            {capacity.battleSecRange.min}–{capacity.battleSecRange.max}s battle by tier) + {capacity.catchSec}s catch per
            raid, plus a {capacity.lobbySec}s lobby wait, {capacity.transitionSecRange.min}–{capacity.transitionSecRange.max}
            s of transitions, and {capacity.downtimeSecRange.min}–{capacity.downtimeSecRange.max}s between raids.
            {remotePool > 0 ? ` Plus ${remotePool} remote raid passes.` : ""}
          </p>
        </div>
      ) : null}
      <ul className="space-y-1.5">
        {ORDER.flatMap((tier) =>
          ESTIMATE_NOTES.filter((n) => n.confidence === tier).map((n) => (
            <li key={n.label} className="flex items-start gap-2">
              <span className="mt-1">
                <Dot c={n.confidence} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium text-slate-200">{n.label}</span>
                  <span className="font-mono text-[13px] text-slate-400">{n.value}</span>
                </div>
                <p className="text-[12px] leading-snug text-slate-500">{n.note}</p>
              </div>
            </li>
          )),
        )}
        <li className="pt-1 text-[12px] text-slate-500">
          Reward amounts are shown as best→worst ranges because in-game drops vary. Values live in one editable config file
          and can be corrected the moment Niantic publishes finals.
        </li>
      </ul>
    </Disclosure>
  );
}
