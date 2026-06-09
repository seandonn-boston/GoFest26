"use client";

import { useState } from "react";
import { getBoss } from "@/data";
import { buildSearchString } from "@/lib/pokemonSearch";
import { usePlannerStore } from "@/store/usePlannerStore";

/** A copyable Pokémon GO search string of every selected target. */
export function SearchStringBar() {
  const inputs = usePlannerStore((s) => s.inputs);
  const [copied, setCopied] = useState(false);

  const bosses = Object.values(inputs)
    .filter((i) => i.selected)
    .map((i) => getBoss(i.bossId))
    .filter((b): b is NonNullable<typeof b> => !!b)
    .sort((a, b) => a.sortPriority - b.sortPriority);

  const search = buildSearchString(bosses.map((b) => b.name));
  if (!search) return null;
  const count = search.split(", ").length;

  async function copy() {
    try {
      await navigator.clipboard.writeText(search);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="brutal rounded-xl bg-gofest-panel/80 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-gofest-acid">
          PoGo search string
        </span>
        <button
          type="button"
          onClick={copy}
          className="rounded-sm border-2 border-black/40 bg-gofest-accent2 px-2.5 py-1 font-mono text-[11px] font-extrabold uppercase tracking-wider text-black shadow-brutal transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <p className="mb-2 text-[11px] text-slate-400">
        Paste into Pokémon GO’s search bar (commas = “or”) to surface all {count} targets at once and
        check your Candy, XL &amp; Mega Energy.
      </p>
      <code className="block max-h-24 overflow-y-auto break-words rounded-sm border border-white/10 bg-gofest-bg/60 p-2 font-mono text-xs leading-relaxed text-slate-200">
        {search}
      </code>
    </div>
  );
}
