"use client";

import { useDeferredValue, useMemo } from "react";
import { getBoss } from "@/data";
import { buildSearchString } from "@/lib/pokemonSearch";
import { usePlannerStore } from "@/store/usePlannerStore";
import { CopyableSearchString } from "@/components/ui/CopyableSearchString";

/** A copyable Pokémon GO search string of every selected target. */
export function SearchStringBar() {
  const inputs = useDeferredValue(usePlannerStore((s) => s.inputs));

  const { search, items, count } = useMemo(() => {
    const bosses = Object.values(inputs)
      .filter((i) => i.selected)
      .map((i) => getBoss(i.bossId))
      .filter((b): b is NonNullable<typeof b> => !!b)
      .sort((a, b) => a.sortPriority - b.sortPriority);
    const search = buildSearchString(bosses.map((b) => b.name));
    // One chip per selected boss, using its own (form-correct) roster sprite — so
    // e.g. Mewtwo X and Y both show, while the copied string lists Mewtwo once.
    const items = bosses.map((b) => ({ key: b.id, label: b.name, sprite: b.sprite }));
    return { search, items, count: search ? search.split(", ").length : 0 };
  }, [inputs]);

  if (!search) return null;

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
