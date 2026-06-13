"use client";

import { getBoss } from "@/data";
import { counterSearchSpecies } from "@/domain/counters";
import { useCopied } from "@/hooks/useCopied";
import { usePlannerStore } from "@/store/usePlannerStore";

/**
 * One copyable Pokémon GO search string of every counter species across all
 * selected targets. Deduped to the final-evolution name only (no Shadow / Mega /
 * Legendary distinction) — paste it into the search bar to flag every Pokémon
 * worth powering up for the weekend.
 */
export function CounterSearchBar() {
  const inputs = usePlannerStore((s) => s.inputs);
  const [copied, copy] = useCopied();

  const types = Object.values(inputs)
    .filter((i) => i.selected)
    .map((i) => getBoss(i.bossId)?.types ?? [])
    .filter((t) => t.length > 0);

  const species = counterSearchSpecies(types);
  if (species.length === 0) return null;
  const search = species.join(", ");

  return (
    <div className="brutal rounded-xl bg-gofest-panel/80 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-gofest-acid">
          Counter search string
        </span>
        <button
          type="button"
          onClick={() => copy(search)}
          className="rounded-sm border-2 border-black/40 bg-gofest-accent2 px-2.5 py-1 font-mono text-[11px] font-extrabold uppercase tracking-wider text-black shadow-brutal transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <p className="mb-2 text-[11px] text-slate-400">
        Every recommended counter across your targets — {species.length} species (commas = “or”).
        Paste into Pokémon GO’s search to spot which attackers you already have and which are worth
        powering up.
      </p>
      <code className="block max-h-24 overflow-y-auto break-words rounded-sm border border-white/10 bg-gofest-bg/60 p-2 font-mono text-xs leading-relaxed text-slate-200">
        {search}
      </code>
    </div>
  );
}
