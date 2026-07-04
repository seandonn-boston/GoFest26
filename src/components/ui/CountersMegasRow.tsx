"use client";

import { useMemo } from "react";
import { getBoss } from "@/data";
import { attackerIconUrl } from "@/data/pokemonSprites";
import { TYPE_COLORS } from "@/data/typeVisuals";
import { topBlockCounters, type BlockCounter } from "@/domain/counters";
import { topBlockMegas, megaBoostSpecies } from "@/domain";
import type { BlockMegaRank } from "@/domain";
import { buildSearchString, buildMegaSearchString } from "@/lib/pokemonSearch";
import { Sprite } from "./Sprite";
import { MegaBoostRow } from "./MegaBoostRow";
import { CopyableInline } from "./Copyable";

/**
 * Block-level best counters + megas to evolve, each as a horizontal row of sprite
 * chips. Counters are ringed by their best super-effective type; megas carry
 * their kind ring (key shown once up top). Presentational — feed it pre-computed
 * lists (see `RaidCountersMegas` to compute from a set of boss ids).
 */
export function CountersMegasChips({
  counters,
  counterSearch,
  megas,
  megaSearch,
}: {
  counters: BlockCounter[];
  counterSearch: string;
  megas: BlockMegaRank[];
  megaSearch: string;
}) {
  if (counters.length === 0 && megas.length === 0) return null;
  return (
    <div className="space-y-1.5 border-t border-white/10 px-2.5 py-2">
      {counters.length > 0 ? (
        <CopyableInline
          search={counterSearch}
          label="counters for this block"
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className="inline-block w-[9ch] shrink-0 whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-gofest-acid">
            Counters
          </span>
          {counters.map((c) => (
            <span
              key={c.attacker.name}
              title={`${c.attacker.name} · strong vs ${c.bossesCovered} raid${c.bossesCovered === 1 ? "" : "s"} here`}
              className="inline-flex rounded-full bg-black/30 ring-2"
              style={{ ["--tw-ring-color" as string]: TYPE_COLORS[c.via.toLowerCase()] }}
            >
              <Sprite src={attackerIconUrl(c.attacker)} alt={c.attacker.name} size={20} />
            </span>
          ))}
        </CopyableInline>
      ) : null}
      {megas.length > 0 ? (
        <CopyableInline
          search={megaSearch}
          label="megas to evolve for this block"
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className="inline-block w-[9ch] shrink-0 whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-purple-300">
            Megas
          </span>
          <MegaBoostRow boosts={megas} size={20} />
        </CopyableInline>
      ) : null}
    </div>
  );
}

/**
 * Compute + render the best counters and megas-to-evolve for a set of raid boss
 * ids (e.g. a Road-of-Legends day's raids, or the remote-raid pool). Renders
 * nothing when no ids resolve to typed bosses — so callers can pass only the
 * bosses that actually have raids allocated and it hides itself at zero.
 */
export function RaidCountersMegas({
  bossIds,
  wildTypes = [],
  prioritySpecies,
}: {
  bossIds: string[];
  /** Featured wild-spawn types (habitat blocks); empty for raid-only windows. */
  wildTypes?: string[];
  prioritySpecies?: string[];
}) {
  const key = bossIds.join(",");
  const wildKey = wildTypes.join(",");
  const prioKey = prioritySpecies?.join(",") ?? "";
  const bossTypes = useMemo(
    () => bossIds.map((id) => getBoss(id)?.types ?? []).filter((t) => t.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  const counters = useMemo(() => topBlockCounters(bossTypes, 8), [bossTypes]);
  const megas = useMemo(
    () => topBlockMegas(wildTypes, bossTypes, { prioritySpecies, limit: 5 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bossTypes, wildKey, prioKey],
  );
  const counterSearch = useMemo(() => buildSearchString(counters.map((c) => c.attacker.name)), [counters]);
  const megaSearch = useMemo(() => buildMegaSearchString(megaBoostSpecies(megas)), [megas]);
  if (bossTypes.length === 0) return null;
  return <CountersMegasChips counters={counters} counterSearch={counterSearch} megas={megas} megaSearch={megaSearch} />;
}
