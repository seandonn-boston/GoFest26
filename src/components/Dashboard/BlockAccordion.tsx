"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PlusToggle } from "@/components/ui/PlusToggle";
import { GAME_CONFIG } from "@/data/config";
import { getBoss, MEWTWO_X_ID, MEWTWO_Y_ID } from "@/data";
import { habitatAt } from "@/data/habitats";
import { attackerIconUrl } from "@/data/pokemonSprites";
import { TYPE_COLORS } from "@/data/typeVisuals";
import { RISK_BANDS, megaBoostsForBoss, topBlockMegas, megaBoostSpecies } from "@/domain";
import { sized } from "@/domain/blockPlan";
import type { BlockMegaRank, BlockPlan, BlockSpeciesShare, RemotePlan, RiskBand, WeekendBlockPlan } from "@/domain";
import { topCounters, topBlockCounters, type BlockCounter } from "@/domain/counters";
import type { BossResult, EventDay } from "@/domain/types";
import { buildSearchString, buildMegaSearchString } from "@/lib/pokemonSearch";
import { hourLabel } from "@/lib/format";
import { usePlannerStore, blockMembersInOrder } from "@/store/usePlannerStore";
import { useDragList } from "./useDragList";
import { Sprite } from "@/components/ui/Sprite";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { MegaBoostRow, MegaBoostLegend } from "@/components/ui/MegaBoostRow";
import { CopyableInline } from "@/components/ui/Copyable";
import { BandBar, BAND_COLOR, BAND_LABEL } from "@/components/ui/BandBar";
import { RemoteAllocator } from "./RemoteAllocator";
import { GoalProgress } from "./GoalProgress";

const DAY_LABEL: Record<EventDay, string> = { sat: "Saturday · Jul 11", sun: "Sunday · Jul 12" };

const blockKey = (b: BlockPlan) => `${b.day}${b.startHour}`;

/** Final-evolution species term from a boss name (e.g. "Mega Mewtwo X" → "Mewtwo"),
 *  so a block's priority order can be matched to mega species for tie-breaking. */
const speciesTerm = (name: string) => name.replace(/^(Mega|Primal)\s+/, "").replace(/\s+[XY]$/, "").trim();

/** Block-level best counters + megas to evolve, each as a horizontal row of sprite
 *  chips (matching the per-target tile rows). Counters are ringed by their best
 *  super-effective type; megas carry their kind ring (key shown once up top). */
function BlockChips({
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
        <CopyableInline search={counterSearch} label="counters for this block" className="flex flex-wrap items-center gap-1.5">
          <span className="inline-block w-[9ch] shrink-0 whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-gofest-acid">Counters</span>
          {counters.map((c) => (
            <span
              key={c.attacker.name}
              title={`${c.attacker.name} · strong vs ${c.bossesCovered} raid${c.bossesCovered === 1 ? "" : "s"} this block`}
              className="inline-flex rounded-full bg-black/30 ring-2"
              style={{ ["--tw-ring-color" as string]: TYPE_COLORS[c.via.toLowerCase()] }}
            >
              <Sprite src={attackerIconUrl(c.attacker)} alt={c.attacker.name} size={20} />
            </span>
          ))}
        </CopyableInline>
      ) : null}
      {megas.length > 0 ? (
        <CopyableInline search={megaSearch} label="megas to evolve for this block" className="flex flex-wrap items-center gap-1.5">
          <span className="inline-block w-[9ch] shrink-0 whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-purple-300">Megas</span>
          <MegaBoostRow boosts={megas} size={20} />
        </CopyableInline>
      ) : null}
    </div>
  );
}

/** One species' target in a block: a drag grip, completed (editable) / best ·
 *  avg · worst raid counts, the boss's types + candy-boost megas, and its best
 *  counters, plus a per-block quick-catch toggle. */
function TargetCard({
  share,
  dkey,
  wildTypes,
  grip,
  gripRight,
  rowRef,
  dragging,
  quickCatch,
}: {
  share: BlockSpeciesShare;
  dkey: string;
  wildTypes: string[];
  grip?: ReactNode;
  /** A second grip on the right edge so the list is thumb-reachable either-handed. */
  gripRight?: ReactNode;
  rowRef?: (el: HTMLElement | null) => void;
  dragging?: boolean;
  quickCatch?: { on: boolean; onToggle: () => void };
}) {
  const done = usePlannerStore((s) => s.raidsDone[dkey] ?? 0);
  const setRaidsDone = usePlannerStore((s) => s.setRaidsDone);
  const rewardCase = usePlannerStore((s) => s.settings.rewardCase);
  // For a multi-form species, show the forme available in THIS block (name/sprite/
  // counters); share.bossId stays the shared primary for result/progress linkage.
  const boss = getBoss(share.formeBossId ?? share.bossId);
  const types = boss?.types ?? [];
  const counters = useMemo(() => topCounters(types), [types]);
  const boosts = useMemo(() => megaBoostsForBoss(types, wildTypes), [types, wildTypes]);
  const counterSearch = useMemo(() => buildSearchString(counters.map((c) => c.attacker.name)), [counters]);
  const megaSearch = useMemo(() => buildMegaSearchString(megaBoostSpecies(boosts)), [boosts]);
  const typeIconEls = types.map((t) => (
    <span key={t} className="inline-flex rounded-full bg-black/40 ring-1 ring-white/15">
      <TypeIcon type={t} size={14} />
    </span>
  ));

  // One number per the selected reward-luck case (optimistic = fewest raids).
  const need = sized(share.range, rewardCase);
  const goalPct = share.raids > 0 ? Math.round((share.fitted / share.raids) * 100) : 100;

  return (
    <div
      ref={rowRef}
      className={`rounded-lg border bg-gofest-bg/40 px-2 py-1.5 transition-shadow ${
        dragging ? "border-gofest-accent2/70 shadow-brutal ring-1 ring-gofest-accent2" : "border-white/10"
      }`}
    >
      <div className="flex items-center gap-2">
        {grip}
        <Sprite src={boss?.sprite} alt={share.bossName} size={28} />
        <span className="min-w-0 flex-1 truncate text-xs text-slate-200">
          {share.bossName.replace(/^Mega /, "")}
          {typeIconEls.length ? <span className="ml-1 inline-flex translate-y-[2px] gap-0.5">{typeIconEls}</span> : null}
        </span>

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
          <span className="text-gofest-accent2" title="Raids needed (selected reward case)">{need}</span>
        </div>

        {share.remaining > 0 ? (
          <span className="shrink-0 text-[12px] text-rose-300" title={`${share.remaining} raids short`}>
            {goalPct}%
          </span>
        ) : null}
        {gripRight}
      </div>

      {/* Per-block quick-catch toggle — sits below the name and above the
          counters (saves time, forfeits catch Candy/XL this block). */}
      {quickCatch ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 pl-[36px]">
          {quickCatch ? (
            <label
              className={`flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wide ${
                quickCatch.on ? "text-amber-300" : "text-slate-500"
              }`}
              title="Quick-catch these raids — saves time, but no catch Candy/XL this block (only completion rewards like Mega Energy / Rare Candy)"
            >
              <input
                type="checkbox"
                checked={quickCatch.on}
                onChange={quickCatch.onToggle}
                aria-label={`Quick-catch ${share.bossName.replace(/^Mega /, "")} this block (no catch Candy/XL)`}
                className="h-4 w-4 accent-amber-400"
              />
              Quick-catch
            </label>
          ) : null}
        </div>
      ) : null}

      {/* Best raid attackers — sprite chips (ringed by the winning move type),
          copyable as a species search string. */}
      {counters.length > 0 ? (
        <CopyableInline
          search={counterSearch}
          label="counters"
          className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-[36px]"
        >
          <span className="inline-block w-[9ch] shrink-0 whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-gofest-acid">Counters</span>
          {counters.map((c) => (
            <span
              key={c.attacker.name}
              title={`${c.attacker.name} · ${c.via}`}
              className="inline-flex rounded-full bg-black/30 ring-2"
              style={{ ["--tw-ring-color" as string]: TYPE_COLORS[c.via.toLowerCase()] }}
            >
              <Sprite src={attackerIconUrl(c.attacker)} alt={c.attacker.name} size={20} />
            </span>
          ))}
        </CopyableInline>
      ) : null}

      {/* Megas worth evolving for this boss's candy — copyable as a search
          string, in the same inline style as the counters row above. */}
      {boosts.length > 0 ? (
        <CopyableInline
          search={megaSearch}
          label="mega evolutions"
          className="mt-2.5 flex flex-wrap items-center gap-1.5 pl-[36px]"
        >
          <span className="inline-block w-[9ch] shrink-0 whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-purple-300">Mega</span>
          <MegaBoostRow boosts={boosts} size={20} max={6} />
        </CopyableInline>
      ) : null}
    </div>
  );
}

const ZERO_BANDS: Record<RiskBand, number> = { blue: 0, green: 0, yellow: 0, red: 0 };

function BlockItem({ block, open, onToggle }: { block: BlockPlan; open: boolean; onToggle: () => void }) {
  const start = GAME_CONFIG.event.hourStartLocal;
  const free = Math.max(0, block.capacity.max - block.fitted);
  const over = block.remaining > 0;
  const wildTypes = habitatAt(block.day, block.startHour)?.types ?? [];
  const key = blockKey(block);

  // Per-block drag-to-rank members = this block's fixed bosses + the eligible
  // Mewtwo form (X on Saturday, Y on Sunday) when selected. Mewtwo always shows
  // even when unallocated, so its block priority can still be ranked.
  const xSel = usePlannerStore((s) => !!s.inputs[MEWTWO_X_ID]?.selected);
  const ySel = usePlannerStore((s) => !!s.inputs[MEWTWO_Y_ID]?.selected);
  const order = usePlannerStore((s) => s.blockPriority[key]);
  const setBlockPriority = usePlannerStore((s) => s.setBlockPriority);
  const quickCatchBlocks = usePlannerStore((s) => s.quickCatchBlocks);
  const toggleQuickCatch = usePlannerStore((s) => s.toggleQuickCatch);

  const memberIds: string[] = [
    ...block.species.filter((s) => !s.mewtwo).map((s) => s.bossId),
    ...(block.day === "sat" && xSel ? [MEWTWO_X_ID] : []),
    ...(block.day === "sun" && ySel ? [MEWTWO_Y_ID] : []),
  ];
  const memberKey = memberIds.join(",");
  const orderKey = (order ?? []).join(",");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the join keys encode the inputs
  const orderedIds = useMemo(() => blockMembersInOrder(memberIds, order ?? []), [memberKey, orderKey]);
  const drag = useDragList(orderedIds, (ids) => setBlockPriority(key, ids));

  const shareFor = (id: string): BlockSpeciesShare =>
    block.species.find((s) => s.bossId === id) ?? {
      bossId: id,
      bossName: getBoss(id)?.name ?? id,
      raids: 0,
      range: { min: 0, max: 0 },
      fitted: 0,
      remaining: 0,
      bands: ZERO_BANDS,
      mewtwo: true,
    };

  // Top megas worth evolving this hour-block (counters now live per-boss inside
  // the accordion). Keyed on the species set + wild theme + block priority order
  // (the latter only breaks ranking ties) so it recomputes when the block changes.
  const memoKey = `${block.species.map((s) => s.bossId).join(",")}|${wildTypes.join(",")}|${orderKey}`;
  const topMegas = useMemo(() => {
    const bossTypes = block.species.map((s) => getBoss(s.bossId)?.types ?? []).filter((t) => t.length > 0);
    const prioritySpecies = orderedIds.map((id) => speciesTerm(getBoss(id)?.name ?? id));
    return topBlockMegas(wildTypes, bossTypes, { prioritySpecies, limit: 5 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- memoKey encodes the inputs
  }, [memoKey]);
  const megaSearch = useMemo(() => buildMegaSearchString(megaBoostSpecies(topMegas)), [topMegas]);

  // Top counters for the whole block — ranked by how many of its raids each
  // attacker is super-effective against (see topBlockCounters).
  const blockCounters = useMemo(() => {
    const bossTypes = block.species.map((s) => getBoss(s.bossId)?.types ?? []).filter((t) => t.length > 0);
    return topBlockCounters(bossTypes, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- memoKey encodes the inputs
  }, [memoKey]);
  const blockCounterSearch = useMemo(
    () => buildSearchString(blockCounters.map((c) => c.attacker.name)),
    [blockCounters],
  );

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02]">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full px-2.5 py-2 text-left">
        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
          <span className="inline-flex items-center truncate">
            <PlusToggle open={open} size={11} className="mr-1.5 shrink-0 text-slate-400" />
            <span className="truncate font-medium text-slate-200">{block.name}</span>
            {wildTypes.length ? (
              <span
                className="ml-1.5 inline-flex shrink-0 items-center gap-0.5"
                title={`Featured wild spawns: ${wildTypes.join(", ")}`}
              >
                {wildTypes.map((t) => (
                  <span key={t} className="inline-flex rounded-full bg-black/40 ring-1 ring-white/15">
                    <TypeIcon type={t} size={13} />
                  </span>
                ))}
              </span>
            ) : null}
            <span className="ml-1.5 shrink-0 text-slate-500">
              {hourLabel(block.startHour, start)}–{hourLabel(block.endHour, start)}
            </span>
          </span>
          <span className={over ? "shrink-0 text-rose-300" : "shrink-0 text-slate-400"}>
            {block.fitted} raid{block.fitted === 1 ? "" : "s"}
            {over ? ` · ${block.remaining} won't fit` : free > 0 ? ` · ${free} to spare` : " · full"}
          </span>
        </div>
        <BandBar bands={block.bands} fitted={block.fitted} capacityMax={block.capacity.max} />
        {over ? (
          <p className="mt-1 text-[13px] font-medium text-rose-300">
            ⚠ {block.remaining} {block.remaining === 1 ? "raid" : "raids"}{" "}can&apos;t fit this 3-hour block — tap for the per-Pokémon breakdown.
          </p>
        ) : null}
      </button>

      {open ? (
        <div className="space-y-1.5 border-t border-white/10 px-2.5 py-2" {...drag.containerProps}>
          <p className="text-[12px] text-slate-500">Drag the ⠿ handle to set this block&apos;s priority (lowest is cut first when over capacity).</p>
          {drag.list.map((id) => {
            const share = shareFor(id);
            // Two grips per row (left + right) so either thumb can drag — same
            // drag id, so either handle reorders the same target.
            const gripEl = (
              <span
                {...drag.gripProps(id, share.bossName)}
                className="flex h-7 w-5 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded text-slate-500 outline-none focus-visible:ring-2 focus-visible:ring-gofest-accent2 active:cursor-grabbing"
              >
                ⠿
              </span>
            );
            return (
              <TargetCard
                key={id}
                share={share}
                dkey={`${id}@${key}`}
                wildTypes={wildTypes}
                grip={gripEl}
                gripRight={
                  <span
                    {...drag.gripProps(id, share.bossName)}
                    className="flex h-7 w-5 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded text-slate-500 outline-none focus-visible:ring-2 focus-visible:ring-gofest-accent2 active:cursor-grabbing"
                  >
                    ⠿
                  </span>
                }
                rowRef={(el) => drag.setRow(id, el)}
                dragging={drag.dragId === id}
                quickCatch={{ on: !!quickCatchBlocks[`${id}@${key}`], onToggle: () => toggleQuickCatch(id, key) }}
              />
            );
          })}
        </div>
      ) : null}

      {/* Block-wide best counters + megas to evolve — kept visible whether the
          block is expanded or collapsed (they vary block to block). */}
      <BlockChips counters={blockCounters} counterSearch={blockCounterSearch} megas={topMegas} megaSearch={megaSearch} />
    </div>
  );
}

/** Remote-raid section: the assigned passes as a bar (top), then the per-species
 *  allocation inputs (the user types how many of each to do remotely). */
function RemoteSection({ remote }: { remote?: RemotePlan }) {
  const fitted = remote?.fitted ?? 0;
  const over = !!remote && remote.remaining > 0;
  return (
    <div className="rounded-lg border border-gofest-accent/30 bg-gofest-accent/[0.04] px-2.5 py-2">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-gofest-accent">Remote raids</span>
        <span className={over ? "shrink-0 text-rose-300" : "shrink-0 text-slate-400"}>
          {fitted} to do{over ? ` · ${remote!.remaining} beyond your remote time` : ""}
        </span>
      </div>
      {remote ? <BandBar bands={remote.bands} fitted={fitted} capacityMax={remote.capacity} /> : null}
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
export function BlockAccordion({
  plan,
  results,
  headStart = {},
}: {
  plan: WeekendBlockPlan;
  results: BossResult[];
  headStart?: Record<string, number>;
}) {
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

  return (
    <div className="mt-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-semibold text-slate-200">Your raid blocks</h3>
        {/* Both keys together: the band colours and the mega-chip ring meaning
            (moved here from each block so it's shown once). */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Legend />
          <MegaBoostLegend />
        </div>
      </div>
      <p className="mb-2 text-[12px] leading-snug text-slate-500">
        Reward luck makes each target a range. The bars fill from{" "}
        <span className="text-sky-300">guaranteed</span> raids you&apos;ll always need, through the{" "}
        <span className="text-emerald-300">best</span> and <span className="text-amber-300">average</span> cases, out to
        the <span className="text-rose-300">worst</span> case if your drops run cold.
      </p>
      <div className="space-y-4">
        {byDay.map(({ day, blocks }) => (
          <div key={day}>
            <div className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-gofest-accent2">{DAY_LABEL[day]}</div>
            <div className="space-y-2">
              {blocks.map((b) => (
                <BlockItem key={blockKey(b)} block={b} open={open.has(blockKey(b))} onToggle={() => toggle(blockKey(b))} />
              ))}
            </div>
          </div>
        ))}
        {useRemote ? (
          <div>
            <div className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-gofest-accent">Remote · either day</div>
            <RemoteSection remote={remote} />
          </div>
        ) : null}
      </div>

      <GoalProgress plan={plan} results={results} headStart={headStart} />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
      {RISK_BANDS.map((b) => (
        <span key={b} className="flex items-center gap-1">
          <span className={`inline-block h-2 w-2 rounded-sm ${BAND_COLOR[b]}`} />
          {BAND_LABEL[b]}
        </span>
      ))}
    </div>
  );
}
