"use client";

import { useDeferredValue, useMemo } from "react";
import { getBoss } from "@/data";
import { bossDays, wildTypesForBoss } from "@/data/habitats";
import { megaBoostsForBoss, mergeMegaBoosts, megaBoostSpecies, type MegaBoost } from "@/domain";
import type { EventDay } from "@/domain/types";
import { buildMegaSearchString } from "@/lib/pokemonSearch";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Copyable } from "@/components/ui/Copyable";
import { MegaBoostRow, MegaBoostLegend } from "@/components/ui/MegaBoostRow";

/**
 * Copyable "& mega3" lists of the candy-boost megas worth evolving — one for
 * Saturday, one for Sunday — shown as ringed sprite chips (same colour scheme as
 * the per-block megas on the results step), so the outline tells you what each
 * brings (boss-type / wild-spawn / attacker). Inputs are deferred so rapid
 * selections coalesce.
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
      <Copyable
        search={search}
        label={`${dayLabel} mega-evolve`}
        className="brutal rounded-xl bg-gofest-panel/80 p-3 transition hover:bg-gofest-panel"
      >
        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pr-8">
          <span className="font-mono text-[13px] font-bold uppercase tracking-widest text-purple-300">
            {dayLabel} mega-evolve
          </span>
          <MegaBoostLegend />
        </div>
        <p className="mb-2 text-[13px] text-slate-400">
          Mega-Evolve one (Mega Level 3) before battling {dayLabel}’s bosses for a same-type Candy XL
          boost — the outline shows what each mega brings this day (see key). Only one counts at a time.
        </p>
        <MegaBoostRow boosts={boosts} size={24} />
      </Copyable>
    );
  };

  return (
    <div className="space-y-3">
      {bar(byDay.sat, "Saturday")}
      {bar(byDay.sun, "Sunday")}
    </div>
  );
}
