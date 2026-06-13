"use client";

import { useMemo } from "react";
import {
  counterBreakdown,
  COUNTER_CATEGORIES,
  COUNTER_CATEGORY_LABEL,
  COUNTER_CATEGORY_FILTER,
  type CounterCategory,
  type ScoredCounter,
} from "@/domain/counters";
import { TYPE_COLORS } from "@/data/typeVisuals";
import { attackerIconUrl } from "@/data/pokemonSprites";
import { buildSearchString } from "@/lib/pokemonSearch";
import { Sprite } from "@/components/ui/Sprite";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { CopyButton, CopyableInline } from "@/components/ui/Copyable";

/**
 * Best raid counters for a boss, computed from its (dual-)type weaknesses and
 * the attacker rankings (domain/counters.ts). Five sprite rows — Shadow, Shadow
 * Legendary, Mega/Primal, Legendary, and Budget — each showing up to five picks
 * as sprites (ringed by the move type that wins) with a copy button that yields
 * that category's exact Pokémon GO search string (species + the bucket filter,
 * e.g. "… & shadow & !legendary …"). The section's top-right button copies every
 * counter species, plain. Pass a label when a card shows more than one typing.
 */
export function CounterTable({ types, label }: { types?: string[]; label?: string }) {
  const { weaknesses, groups } = useMemo(() => counterBreakdown(types ?? []), [types]);

  const hasAny = COUNTER_CATEGORIES.some((c) => groups[c].length > 0);
  // Section "copy all": every counter species, deduped, no per-bucket filter.
  const allSearch = useMemo(
    () => buildSearchString(COUNTER_CATEGORIES.flatMap((c) => groups[c]).map((x) => x.attacker.name)),
    [groups],
  );
  if (!hasAny) return null;

  return (
    <div className="relative mt-3 rounded-lg border border-white/10 bg-gofest-bg/40 p-2.5">
      {allSearch ? <CopyButton search={allSearch} label="all counters" className="absolute right-2 top-2" /> : null}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pr-8">
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

      <div className="mt-2 space-y-1.5">
        {COUNTER_CATEGORIES.map((cat) =>
          groups[cat].length > 0 ? <CategoryRow key={cat} cat={cat} picks={groups[cat]} /> : null,
        )}
      </div>
    </div>
  );
}

/** One category: label + up to five sprite chips + a flush-right copy button
 *  carrying that bucket's full search string. The row itself is click-to-copy. */
function CategoryRow({ cat, picks }: { cat: CounterCategory; picks: ScoredCounter[] }) {
  const search = `${buildSearchString(picks.map((p) => p.attacker.name))} ${COUNTER_CATEGORY_FILTER[cat]}`;
  return (
    <CopyableInline search={search} label={`${COUNTER_CATEGORY_LABEL[cat]} counters`} className="flex items-center gap-2">
      <span className="w-[58px] shrink-0 text-[9px] font-semibold uppercase leading-tight tracking-wide text-slate-400">
        {COUNTER_CATEGORY_LABEL[cat]}
      </span>
      <div className="flex flex-1 flex-wrap items-center gap-1">
        {picks.map((p) => (
          <span
            key={p.attacker.name}
            title={`${p.attacker.name} · ${p.via}`}
            className="inline-flex rounded-full bg-black/30 ring-2"
            style={{ ["--tw-ring-color" as string]: TYPE_COLORS[p.via.toLowerCase()] }}
          >
            <Sprite src={attackerIconUrl(p.attacker)} alt={p.attacker.name} size={28} />
          </span>
        ))}
      </div>
    </CopyableInline>
  );
}
