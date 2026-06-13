"use client";

import { getBoss } from "@/data";
import { wildTypesForBoss } from "@/data/habitats";
import { megaBoostsForBoss, mergeMegaBoosts, megaBoostSpecies } from "@/domain";
import { buildMegaSearchString } from "@/lib/pokemonSearch";
import { usePlannerStore } from "@/store/usePlannerStore";
import { CopyableSearchString } from "@/components/ui/CopyableSearchString";
import { MEGA_KIND_RING } from "@/components/ui/MegaBoostRow";

/**
 * One copyable "& mega3" search string of every candy-boost mega across all
 * selected targets — the Mega-Level-3 Pokémon worth evolving over the weekend to
 * farm same-type Candy XL. Sprites are outlined by role (attacker / wild / boss).
 */
export function MegaSearchBar() {
  const inputs = usePlannerStore((s) => s.inputs);

  const lists = Object.values(inputs)
    .filter((i) => i.selected)
    .map((i) => getBoss(i.bossId))
    .filter((b): b is NonNullable<typeof b> => !!b)
    .map((b) => megaBoostsForBoss(b.types ?? [], wildTypesForBoss(b)));

  const boosts = mergeMegaBoosts(lists);
  const species = megaBoostSpecies(boosts);
  const search = buildMegaSearchString(species);
  if (!search) return null;

  return (
    <CopyableSearchString
      label="Mega-evolve search string"
      accent="text-purple-300"
      search={search}
      items={boosts.map((b) => ({ key: b.mega.name, label: b.mega.name, sprite: b.mega.sprite, ring: MEGA_KIND_RING[b.kind] }))}
      caption={
        <>
          Mega-Evolve one of these (at Mega Level 3) before you battle for a same-type Candy XL boost
          on every raid &amp; wild catch — outline shows{" "}
          <span className="text-purple-300">attacker</span>,{" "}
          <span className="text-sky-300">wild-spawn boost</span>, or boss-only. Only one mega counts at
          a time. <span className="font-mono">&amp; mega3</span> filters to your Level-3 megas.
        </>
      }
    />
  );
}
