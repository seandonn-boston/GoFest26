"use client";

import { useDeferredValue, useMemo } from "react";
import { getBoss } from "@/data";
import { bossDays, wildTypesForBoss } from "@/data/habitats";
import { megaBoostsForBoss, mergeMegaBoosts, megaBoostSpecies, type MegaBoost } from "@/domain";
import type { EventDay } from "@/domain/types";
import { buildMegaSearchString } from "@/lib/pokemonSearch";
import { usePlannerStore } from "@/store/usePlannerStore";
import { CopyableSearchString } from "@/components/ui/CopyableSearchString";
import { MEGA_KIND_COLOR } from "@/components/ui/MegaBoostRow";

/**
 * Copyable "& mega3" search strings of the candy-boost megas worth evolving —
 * one for Saturday, one for Sunday — so you can grab the right Mega-Level-3 list
 * the day of. Sprites are outlined by role (attacker / wild / boss); a mega can
 * appear on both days. Inputs are deferred so rapid selections coalesce.
 */
export function MegaSearchBar() {
  const inputs = useDeferredValue(usePlannerStore((s) => s.inputs));

  const byDay = useMemo(() => {
    const selected = Object.values(inputs)
      .filter((i) => i.selected)
      .map((i) => getBoss(i.bossId))
      .filter((b): b is NonNullable<typeof b> => !!b);
    const pick = (day: EventDay) =>
      mergeMegaBoosts(
        selected
          .filter((b) => bossDays(b).includes(day))
          .map((b) => megaBoostsForBoss(b.types ?? [], wildTypesForBoss(b))),
      );
    return { sat: pick("sat"), sun: pick("sun") };
  }, [inputs]);

  const bar = (boosts: MegaBoost[], dayLabel: string) => {
    const search = buildMegaSearchString(megaBoostSpecies(boosts));
    if (!search) return null;
    return (
      <CopyableSearchString
        label={`${dayLabel} mega-evolve`}
        accent="text-purple-300"
        search={search}
        items={boosts.map((b) => ({ key: b.mega.name, label: b.mega.name, color: MEGA_KIND_COLOR[b.kind] }))}
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
      {bar(byDay.sat, "Saturday")}
      {bar(byDay.sun, "Sunday")}
    </>
  );
}
