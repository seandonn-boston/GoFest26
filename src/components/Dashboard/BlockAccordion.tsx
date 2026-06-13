"use client";

import { useMemo, useState } from "react";
import { GAME_CONFIG } from "@/data/config";
import { getBoss } from "@/data";
import { habitatAt } from "@/data/habitats";
import { TYPE_COLORS } from "@/data/typeVisuals";
import { RISK_BANDS, rareCandyForecast, megaBoostsForBoss, blockMegaBoosts, megaBoostSpecies } from "@/domain";
import type { BlockPlan, BlockSpeciesShare, RemotePlan, RiskBand, WeekendBlockPlan } from "@/domain";
import { topCounters } from "@/domain/counters";
import type { BossResult, EventDay } from "@/domain/types";
import { buildSearchString, buildMegaSearchString } from "@/lib/pokemonSearch";
import { hourLabel } from "@/lib/format";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Sprite } from "@/components/ui/Sprite";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { CopyableSearchString } from "@/components/ui/CopyableSearchString";
import { MegaBoostRow, MEGA_KIND_RING } from "@/components/ui/MegaBoostRow";
import { CopyableInline } from "@/components/ui/Copyable";
import { RemoteAllocator } from "./RemoteAllocator";
import { GoalProgress } from "./GoalProgress";

const BAND_COLOR: Record<RiskBand, string> = {
  blue: "bg-sky-500",
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-rose-500",
};
const BAND_LABEL: Record<RiskBand, string> = {
  blue: "Guaranteed",
  green: "Best case",
  yellow: "Average",
  red: "Worst case",
};
const DAY_LABEL: Record<EventDay, string> = { sat: "Saturday · Jul 11", sun: "Sunday · Jul 12" };

const blockKey = (b: BlockPlan) => `${b.day}${b.startHour}`;

/** Confidence-banded capacity bar. The bar IS 100%; raids that don't fit are
 *  never drawn — they're reported as the shortfall beneath it. */
function CapacityBar({ bands, fitted, capacityMax }: { bands: Record<RiskBand, number>; fitted: number; capacityMax: number }) {
  const scale = Math.max(capacityMax, 1);
  const free = Math.max(0, capacityMax - fitted);
  const pct = (n: number) => `${(n / scale) * 100}%`;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-inset ring-white/10">
      {RISK_BANDS.map((b) =>
        bands[b] > 0 ? (
          <div key={b} className={BAND_COLOR[b]} style={{ width: pct(bands[b]) }} title={`${BAND_LABEL[b]}: ${bands[b]}`} />
        ) : null,
      )}
      {free > 0 ? <div style={{ width: pct(free) }} /> : null}
    </div>
  );
}

/** One species' target: completed (editable) / best · avg · worst raid counts,
 *  with the boss's types + the megas worth evolving for its candy underneath. */
function TargetCard({ share, dkey, wildTypes }: { share: BlockSpeciesShare; dkey: string; wildTypes: string[] }) {
  const done = usePlannerStore((s) => s.raidsDone[dkey] ?? 0);
  const setRaidsDone = usePlannerStore((s) => s.setRaidsDone);
  const boss = getBoss(share.bossId);
  const types = boss?.types ?? [];
  const counters = useMemo(() => topCounters(types), [types]);
  const boosts = useMemo(() => megaBoostsForBoss(types, wildTypes), [types, wildTypes]);
  const counterSearch = useMemo(() => buildSearchString(counters.map((c) => c.attacker.name)), [counters]);
  const megaSearch = useMemo(() => buildMegaSearchString(megaBoostSpecies(boosts)), [boosts]);

  const g = share.range.min; // best case
  const r = share.range.max; // worst case
  const y = Math.min(r, Math.max(g, Math.round((g + r) / 2))); // average
  const goalPct = share.raids > 0 ? Math.round((share.fitted / share.raids) * 100) : 100;

  return (
    <div className="rounded-lg border border-white/10 bg-gofest-bg/40 px-2 py-1.5">
      <div className="flex items-center gap-2">
        <Sprite src={boss?.sprite} alt={share.bossName} size={28} />
        <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{share.bossName.replace(/^Mega /, "")}</span>

        <div className="flex items-center gap-1 font-mono text-sm font-bold">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={String(done)}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setRaidsDone(dkey, Math.round(Number(e.target.value.replace(/[^\d]/g, "")) || 0))}
            aria-label={`Raids completed for ${share.bossName}`}
            className="w-10 rounded-sm border border-white/15 bg-gofest-bg/60 px-1 py-0.5 text-center text-slate-100 outline-none focus:border-gofest-accent2"
          />
          <span className="text-slate-500">/</span>
          <span className="text-emerald-400" title="Best case (fewest raids)">{g}</span>
          <span className="text-amber-400" title="Average">{y}</span>
          <span className="text-rose-400" title="Worst case (most raids)">{r}</span>
        </div>

        {share.remaining > 0 ? (
          <span className="shrink-0 text-[10px] text-rose-300" title={`${share.remaining} raids short`}>
            {goalPct}%
          </span>
        ) : null}
      </div>

      {/* Best raid attackers — a copyable search string, tinted by the move type that wins. */}
      {counters.length > 0 ? (
        <CopyableInline
          search={counterSearch}
          label="counters"
          className="mt-1.5 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 pl-[36px] text-[11px] leading-relaxed"
        >
          <span className="mr-0.5 font-mono text-[9px] uppercase tracking-wider text-gofest-acid">Counters</span>
          {counters.map((c, i) => (
            <span key={c.attacker.name}>
              {i > 0 ? <span className="text-slate-600"> · </span> : null}
              <span style={{ color: TYPE_COLORS[c.via.toLowerCase()] }}>{c.attacker.name}</span>
            </span>
          ))}
        </CopyableInline>
      ) : null}

      {/* Boss typing + the megas worth evolving for its candy (the megas copy as a string). */}
      {types.length > 0 || boosts.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-[36px]">
          {types.map((t) => (
            <span key={t} className="inline-flex rounded-full bg-black/40 ring-1 ring-white/15">
              <TypeIcon type={t} size={14} />
            </span>
          ))}
          {boosts.length > 0 ? (
            <>
              <span className="mx-0.5 text-slate-600" aria-hidden>·</span>
              <CopyableInline search={megaSearch} label="mega evolutions" className="flex flex-wrap items-center gap-1">
                <MegaBoostRow boosts={boosts} size={18} max={6} />
              </CopyableInline>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BlockItem({ block, open, onToggle }: { block: BlockPlan; open: boolean; onToggle: () => void }) {
  const start = GAME_CONFIG.event.hourStartLocal;
  const free = Math.max(0, block.capacity.max - block.fitted);
  const over = block.remaining > 0;
  const wildTypes = habitatAt(block.day, block.startHour)?.types ?? [];

  // Mega-evolve search string for this hour-block's roster (counters now live
  // per-boss inside the accordion). Keyed on the species set + wild theme so it
  // only recomputes when the block changes.
  const memoKey = `${block.species.map((s) => s.bossId).join(",")}|${wildTypes.join(",")}`;
  const { megaSearch, megaItems } = useMemo(() => {
    const bossTypes = block.species.map((s) => getBoss(s.bossId)?.types ?? []).filter((t) => t.length > 0);
    const boosts = blockMegaBoosts(wildTypes, bossTypes);
    return {
      megaSearch: buildMegaSearchString(megaBoostSpecies(boosts)),
      megaItems: boosts.map((b) => ({ key: b.mega.name, label: b.mega.name, sprite: b.mega.sprite, ring: MEGA_KIND_RING[b.kind] })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- memoKey encodes the inputs
  }, [memoKey]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full px-2.5 py-2 text-left">
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
          <span className="truncate">
            <span className={`mr-1 inline-block text-slate-500 transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
            <span className="font-medium text-slate-200">{block.name}</span>
            <span className="ml-1.5 text-slate-500">
              {hourLabel(block.startHour, start)}–{hourLabel(block.endHour, start)}
            </span>
          </span>
          <span className={over ? "shrink-0 text-rose-300" : "shrink-0 text-slate-400"}>
            {block.fitted} raid{block.fitted === 1 ? "" : "s"}
            {over ? ` · ${block.remaining} won't fit` : free > 0 ? ` · ${free} to spare` : " · full"}
          </span>
        </div>
        <CapacityBar bands={block.bands} fitted={block.fitted} capacityMax={block.capacity.max} />
        {over ? (
          <p className="mt-1 text-[11px] font-medium text-rose-300">
            ⚠ {block.remaining} {block.remaining === 1 ? "raid" : "raids"}{" "}can&apos;t fit this 3-hour block — tap for the per-Pokémon breakdown.
          </p>
        ) : null}
      </button>

      {open ? (
        <div className="space-y-1.5 border-t border-white/10 px-2.5 py-2">
          {block.species.map((s) => (
            <TargetCard
              key={s.bossId + (s.mewtwo ? "-m" : "")}
              share={s}
              dkey={`${s.bossId}@${block.day}${block.startHour}`}
              wildTypes={wildTypes}
            />
          ))}
        </div>
      ) : null}

      {/* Mega-evolve search string for the hour-block — kept visible whether the
          block is expanded or collapsed (the best mega varies block to block). */}
      {megaSearch ? (
        <div className="border-t border-white/10 px-2.5 py-2">
          <CopyableSearchString label={`Mega-evolve · ${block.name}`} accent="text-purple-300" search={megaSearch} items={megaItems} />
        </div>
      ) : null}
    </div>
  );
}

/** Remote-raid section: the assigned passes as a bar (top), then the per-species
 *  allocation inputs (the user types how many of each to do remotely). */
function RemoteSection({ remote }: { remote?: RemotePlan }) {
  const budget = usePlannerStore((s) => s.settings.remoteRaidBudget);
  const free = remote ? Math.max(0, remote.capacity - remote.fitted) : budget;
  const over = !!remote && remote.remaining > 0;
  return (
    <div className="rounded-lg border border-gofest-accent/30 bg-gofest-accent/[0.04] px-2.5 py-2">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-gofest-accent">Remote raids</span>
        <span className={over ? "shrink-0 text-rose-300" : "shrink-0 text-slate-400"}>
          {remote?.fitted ?? 0}/{budget} passes
          {over ? ` · ${remote!.remaining} over` : free > 0 ? ` · ${free} spare` : " · full"}
        </span>
      </div>
      {remote ? <CapacityBar bands={remote.bands} fitted={remote.fitted} capacityMax={remote.capacity} /> : null}
      <RemoteAllocator />
    </div>
  );
}

/**
 * The weekend's habitat blocks (plus the opt-in remote-raid pool) as collapsible
 * accordions. Each capacity bar is a tap-to-expand header; the body lists one
 * target card per species — completed (editable) over best/average/worst counts.
 * Bars fill to 100% in priority order, reporting any shortfall rather than
 * overflowing. Region-locked targets live only in the remote pool.
 */
export function BlockAccordion({ plan, results }: { plan: WeekendBlockPlan; results: BossResult[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const useRemote = usePlannerStore((s) => s.settings.useRemoteRaids);
  const toggle = (k: string) =>
    setOpen((cur) => {
      const next = new Set(cur);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const byDay: { day: EventDay; blocks: BlockPlan[] }[] = [];
  for (const day of ["sat", "sun"] as EventDay[]) {
    const blocks = plan.blocks.filter((b) => b.day === day && b.demand > 0);
    if (blocks.length) byDay.push({ day, blocks });
  }
  const remote = plan.remote && plan.remote.species.length > 0 ? plan.remote : undefined;
  if (!byDay.length && !useRemote) return null;
  const bonus = rareCandyForecast(plan);

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Your raid blocks</h3>
        <Legend />
      </div>
      <div className="space-y-4">
        {byDay.map(({ day, blocks }) => (
          <div key={day}>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gofest-accent2">{DAY_LABEL[day]}</div>
            <div className="space-y-2">
              {blocks.map((b) => (
                <BlockItem key={blockKey(b)} block={b} open={open.has(blockKey(b))} onToggle={() => toggle(blockKey(b))} />
              ))}
            </div>
          </div>
        ))}
        {useRemote ? (
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gofest-accent">Remote · either day</div>
            <RemoteSection remote={remote} />
          </div>
        ) : null}
      </div>

      <GoalProgress plan={plan} results={results} />

      <div className="mt-3 rounded-lg border border-amber-300/25 bg-amber-300/[0.05] p-2.5">
        <div className="text-[11px] uppercase tracking-wide text-amber-200/80">Rare Candy from these raids</div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
          <span>
            <span className="font-bold text-amber-200">≈{bonus.rareCandy}</span> <span className="text-slate-300">Rare Candy</span>
          </span>
          <span>
            <span className="font-bold text-amber-200">≈{bonus.rareCandyXl}</span> <span className="text-slate-300">Rare Candy XL</span>
          </span>
        </div>
        <p className="mt-1 text-[10px] text-slate-500">
          ~1 Rare Candy per raid, plus 1 Rare Candy XL per 5★ &amp; Mega Mewtwo raid (not regular Megas) — spend it on any species.
        </p>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Tap a block to track each target: <span className="font-mono text-slate-300">done</span> ⁄{" "}
        <span className="font-mono text-emerald-400">best</span> <span className="font-mono text-amber-400">avg</span>{" "}
        <span className="font-mono text-rose-400">worst</span> raids. Mega Mewtwo spreads across blocks (X energy
        Saturday, Y Sunday; XL-candy raids flow to whichever block has room).
      </p>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-400">
      {RISK_BANDS.map((b) => (
        <span key={b} className="flex items-center gap-1">
          <span className={`inline-block h-2 w-2 rounded-sm ${BAND_COLOR[b]}`} />
          {BAND_LABEL[b]}
        </span>
      ))}
    </div>
  );
}
