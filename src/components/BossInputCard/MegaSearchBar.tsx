"use client";

import { getBoss } from "@/data";
import { bossDays, wildTypesForBoss } from "@/data/habitats";
import { megaBoostsForBoss, mergeMegaBoosts, megaBoostSpecies } from "@/domain";
import type { EventDay } from "@/domain/types";
import { buildMegaSearchString } from "@/lib/pokemonSearch";
import { usePlannerStore } from "@/store/usePlannerStore";
import { CopyableSearchString } from "@/components/ui/CopyableSearchString";
import { MEGA_KIND_RING } from "@/components/ui/MegaBoostRow";

/**
 * Copyable "& mega3" search strings of the candy-boost megas worth evolving —
 * one for Saturday, one for Sunday — so you can grab the right Mega-Level-3 list
 * the day of. Sprites are outlined by role (attacker / wild / boss); a mega can
 * appear on both days.
 */
export function MegaSearchBar() {
  const inputs = usePlannerStore((s) => s.inputs);
  const selected = Object.values(inputs)
    .filter((i) => i.selected)
    .map((i) => getBoss(i.bossId))
    .filter((b): b is NonNullable<typeof b> => !!b);

  const dayBar = (day: EventDay, dayLabel: string) => {
    const lists = selected
      .filter((b) => bossDays(b).includes(day))
      .map((b) => megaBoostsForBoss(b.types ?? [], wildTypesForBoss(b)));
    const boosts = mergeMegaBoosts(lists);
    const search = buildMegaSearchString(megaBoostSpecies(boosts));
    if (!search) return null;
    return (
      <CopyableSearchString
        label={`${dayLabel} mega-evolve`}
        accent="text-purple-300"
        search={search}
        items={boosts.map((b) => ({ key: b.mega.name, label: b.mega.name, sprite: b.mega.sprite, ring: MEGA_KIND_RING[b.kind] }))}
        caption={
          <>
            Mega-Evolve one (Mega Level 3) before battling {dayLabel}’s bosses for a same-type Candy XL
            boost — outline shows <span className="text-purple-300">attacker</span>,{" "}
            <span className="text-sky-300">wild-spawn boost</span>, or boss-only. Only one counts at a time.
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
