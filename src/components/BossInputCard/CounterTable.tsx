"use client";

import { useMemo } from "react";
import { counterBreakdown, CATEGORY_ORDER } from "@/domain/counters";
import type { AttackerCategory } from "@/data/attackers";
import { TYPE_COLORS } from "@/data/typeVisuals";
import { TypeIcon } from "@/components/ui/TypeIcon";

const CATEGORY_LABEL: Record<AttackerCategory, string> = {
  shadow: "Shadow",
  mega: "Mega / Primal",
  legendary: "Legendary",
  regular: "Non-Legendary",
};

/**
 * Best raid counters for a boss, computed from its (dual-)type weaknesses and
 * the attacker rankings (domain/counters.ts). Four lists — top 5 Shadow, Mega,
 * Legendary, and regular picks — each name tinted by the move type that makes
 * it super-effective. Forms repeat across lists by design (Salamence / Mega /
 * Shadow are all valid). Pass a label when a card shows more than one typing.
 */
export function CounterTable({ types, label }: { types?: string[]; label?: string }) {
  const { weaknesses, groups } = useMemo(() => counterBreakdown(types ?? []), [types]);

  // Pure Normal (and the like) have no super-effective answer — nothing to list.
  const hasAny = CATEGORY_ORDER.some((c) => groups[c].length > 0);
  if (!hasAny) return null;

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-gofest-bg/40 p-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-gofest-acid">
          Best counters{label ? ` · ${label}` : ""}
        </span>
        {weaknesses.length > 0 ? (
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            weak to
            {weaknesses.map((w) => (
              <span key={w.type} className="inline-flex items-center" title={`${w.type} ×${w.mult.toFixed(2)}`}>
                <TypeIcon type={w.type} size={15} />
                {w.mult > 2 ? <sup className="ml-0.5 text-[8px] font-bold text-rose-300">2×</sup> : null}
              </span>
            ))}
          </span>
        ) : null}
      </div>

      <div className="mt-1.5 space-y-1">
        {CATEGORY_ORDER.map((cat) =>
          groups[cat].length > 0 ? (
            <div key={cat} className="flex gap-2 text-[11px]">
              <span className="w-[88px] shrink-0 pt-px font-semibold uppercase tracking-wide text-slate-400">
                {CATEGORY_LABEL[cat]}
              </span>
              <span className="min-w-0 flex-1 text-slate-200">
                {groups[cat].map((c, i) => (
                  <span key={c.attacker.name}>
                    {i > 0 ? <span className="text-slate-600"> · </span> : null}
                    <span style={{ color: TYPE_COLORS[c.via.toLowerCase()] }}>{c.attacker.name}</span>
                  </span>
                ))}
              </span>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
