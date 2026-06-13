"use client";

import { getBoss } from "@/data";
import { speciesIconUrl } from "@/data/pokemonSprites";
import { counterSearchSpecies } from "@/domain/counters";
import { usePlannerStore } from "@/store/usePlannerStore";
import { CopyableSearchString } from "@/components/ui/CopyableSearchString";

/**
 * One copyable Pokémon GO search string of every counter species across all
 * selected targets. Deduped to the final-evolution name only (no Shadow / Mega /
 * Legendary distinction) — paste it into the search bar to flag every Pokémon
 * worth powering up for the weekend.
 */
export function CounterSearchBar() {
  const inputs = usePlannerStore((s) => s.inputs);

  const types = Object.values(inputs)
    .filter((i) => i.selected)
    .map((i) => getBoss(i.bossId)?.types ?? [])
    .filter((t) => t.length > 0);

  const species = counterSearchSpecies(types);
  if (species.length === 0) return null;

  return (
    <CopyableSearchString
      label="Counter search string"
      search={species.join(", ")}
      items={species.map((s) => ({ key: s, label: s, sprite: speciesIconUrl(s) }))}
      caption={
        <>
          Every recommended counter across your targets — {species.length} species (commas = “or”).
          Paste into Pokémon GO’s search to spot which attackers you already have and which are worth
          powering up.
        </>
      }
    />
  );
}
