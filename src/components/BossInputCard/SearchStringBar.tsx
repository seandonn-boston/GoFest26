"use client";

import { useDeferredValue, useMemo } from "react";
import { getBoss } from "@/data";
import { buildSearchString } from "@/lib/pokemonSearch";
import { usePlannerStore } from "@/store/usePlannerStore";
import { CopyableSearchString } from "@/components/ui/CopyableSearchString";

/** A copyable Pokémon GO search string of every selected target, reduced to bare
 *  species names (Mega Mewtwo X & Y → "Mewtwo") and deduped — that's all the GO
 *  search bar needs. (Only this box; other search strings keep their own form.) */
export function SearchStringBar() {
  const inputs = useDeferredValue(usePlannerStore((s) => s.inputs));

  const { search, count } = useMemo(() => {
    const bosses = Object.values(inputs)
      .filter((i) => i.selected)
      .map((i) => getBoss(i.bossId))
      .filter((b): b is NonNullable<typeof b> => !!b)
      .sort((a, b) => a.sortPriority - b.sortPriority);
    // buildSearchString already strips Mega/forme qualifiers and dedupes to species.
    const search = buildSearchString(bosses.map((b) => b.name));
    return { search, count: search ? search.split(", ").length : 0 };
  }, [inputs]);

  if (!search) return null;

  return (
    <CopyableSearchString
      label="PoGo search string"
      search={search}
      // No per-forme chips here — show the bare species string itself.
      items={[]}
      // Long list of species — clamp to two rows behind a clickable “…”.
      collapsible
      caption={
        <>
          Paste into Pokémon GO’s search bar (commas = “or”) to surface all {count} species at once and
          check your Candy, XL &amp; Mega Energy.
        </>
      }
    />
  );
}
