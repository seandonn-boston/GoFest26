"use client";

import { useDeferredValue, useMemo } from "react";
import { getBoss } from "@/data";
import { bossDays } from "@/data/habitats";
import { attackerIconUrl } from "@/data/pokemonSprites";
import { counterSearchPicks, type ScoredCounter } from "@/domain/counters";
import type { EventDay } from "@/domain/types";
import { usePlannerStore } from "@/store/usePlannerStore";
import { CopyableSearchString } from "@/components/ui/CopyableSearchString";

/**
 * Copyable counter search strings — one for Saturday's bosses, one for Sunday's
 * — so you can paste the right list the day of. Each is the deduped final-
 * evolution names of every recommended counter across that day's targets (no
 * Shadow / Mega distinction); species can repeat across the two days. Inputs are
 * deferred so a burst of selections coalesces into far fewer recomputes.
 */
export function CounterSearchBar() {
  const inputs = useDeferredValue(usePlannerStore((s) => s.inputs));

  const byDay = useMemo(() => {
    const selected = Object.values(inputs)
      .filter((i) => i.selected)
      .map((i) => getBoss(i.bossId))
      .filter((b): b is NonNullable<typeof b> => !!b);
    const pick = (day: EventDay) =>
      counterSearchPicks(
        selected
          .filter((b) => bossDays(b).includes(day))
          .map((b) => b.types ?? [])
          .filter((t) => t.length > 0),
      );
    return { sat: pick("sat"), sun: pick("sun") };
  }, [inputs]);

  const bar = (picks: ScoredCounter[], dayLabel: string) =>
    picks.length === 0 ? null : (
      <CopyableSearchString
        label={`${dayLabel} counters`}
        // Copy lists each species once; chips show the relevant form's sprite.
        search={picks.map((p) => p.attacker.species).join(", ")}
        items={picks.map((p) => ({
          key: p.attacker.species,
          label: p.attacker.name,
          sprite: attackerIconUrl(p.attacker),
        }))}
        caption={
          <>
            Best counters across {dayLabel}’s targets — {picks.length} species (commas = “or”). Paste
            into Pokémon GO to spot which attackers you have and which to power up.
          </>
        }
      />
    );

  return (
    <>
      {bar(byDay.sat, "Saturday")}
      {bar(byDay.sun, "Sunday")}
    </>
  );
}
