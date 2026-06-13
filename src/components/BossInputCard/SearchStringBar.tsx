"use client";

import { getBoss } from "@/data";
import { speciesIconUrl } from "@/data/pokemonSprites";
import { buildSearchString, pokemonSearchName } from "@/lib/pokemonSearch";
import { usePlannerStore } from "@/store/usePlannerStore";
import { CopyableSearchString } from "@/components/ui/CopyableSearchString";

/** A copyable Pokémon GO search string of every selected target. */
export function SearchStringBar() {
  const inputs = usePlannerStore((s) => s.inputs);

  const bosses = Object.values(inputs)
    .filter((i) => i.selected)
    .map((i) => getBoss(i.bossId))
    .filter((b): b is NonNullable<typeof b> => !!b)
    .sort((a, b) => a.sortPriority - b.sortPriority);

  const search = buildSearchString(bosses.map((b) => b.name));
  if (!search) return null;
  const count = search.split(", ").length;

  // One sprite per unique search term (species), preserving the string's order.
  const seen = new Set<string>();
  const items: { key: string; label: string; sprite?: string }[] = [];
  for (const b of bosses) {
    const term = pokemonSearchName(b.name);
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;
    seen.add(key);
    items.push({ key: term, label: term, sprite: speciesIconUrl(term) });
  }

  return (
    <CopyableSearchString
      label="PoGo search string"
      search={search}
      items={items}
      caption={
        <>
          Paste into Pokémon GO’s search bar (commas = “or”) to surface all {count} targets at once and
          check your Candy, XL &amp; Mega Energy.
        </>
      }
    />
  );
}
