"use client";

import { getBoss } from "@/data";
import { bossDays } from "@/data/habitats";
import { speciesIconUrl } from "@/data/pokemonSprites";
import { counterSearchSpecies } from "@/domain/counters";
import type { EventDay } from "@/domain/types";
import { usePlannerStore } from "@/store/usePlannerStore";
import { CopyableSearchString } from "@/components/ui/CopyableSearchString";

/**
 * Copyable counter search strings — one for Saturday's bosses, one for Sunday's
 * — so you can paste the right list the day of. Each is the deduped final-
 * evolution names of every recommended counter across that day's targets (no
 * Shadow / Mega distinction); species can repeat across the two days.
 */
export function CounterSearchBar() {
  const inputs = usePlannerStore((s) => s.inputs);
  const selected = Object.values(inputs)
    .filter((i) => i.selected)
    .map((i) => getBoss(i.bossId))
    .filter((b): b is NonNullable<typeof b> => !!b);

  const dayBar = (day: EventDay, dayLabel: string) => {
    const types = selected
      .filter((b) => bossDays(b).includes(day))
      .map((b) => b.types ?? [])
      .filter((t) => t.length > 0);
    const species = counterSearchSpecies(types);
    if (species.length === 0) return null;
    return (
      <CopyableSearchString
        label={`${dayLabel} counters`}
        search={species.join(", ")}
        items={species.map((s) => ({ key: s, label: s, sprite: speciesIconUrl(s) }))}
        caption={
          <>
            Best counters across {dayLabel}’s targets — {species.length} species (commas = “or”). Paste
            into Pokémon GO to spot which attackers you have and which to power up.
          </>
        }
      />
    );
  };

  return (
    <>
      {dayBar("sat", "Saturday")}
      {dayBar("sun", "Sunday")}
    </>
  );
}
