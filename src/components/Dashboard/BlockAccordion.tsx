"use client";

import { useMemo, type ReactNode } from "react";
import { PlusToggle } from "@/components/ui/PlusToggle";
import { useExpandable } from "@/hooks/useExpandable";
import { GAME_CONFIG } from "@/data/config";
import { getBoss, MEWTWO_X_ID, MEWTWO_Y_ID } from "@/data";
import { habitatAt } from "@/data/habitats";
import { attackerIconUrl } from "@/data/pokemonSprites";
import { TYPE_COLORS, typeBackgroundStyle, typePanelStyle } from "@/data/typeVisuals";
import { RISK_BANDS, megaBoostsForBoss, topBlockMegas, megaBoostSpecies } from "@/domain";
import { sized } from "@/domain/blockPlan";
import type { BlockPlan, BlockSpeciesShare, RiskBand, WeekendBlockPlan } from "@/domain";
import { topCounters, topBlockCounters } from "@/domain/counters";
import type { BossResult, EventDay, Range } from "@/domain/types";
import { buildSearchString, buildMegaSearchString } from "@/lib/pokemonSearch";
import { hourLabel } from "@/lib/format";
import { usePlannerStore, blockMembersInOrder } from "@/store/usePlannerStore";
import { useDragList } from "./useDragList";
import { Sprite } from "@/components/ui/Sprite";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { MegaBoostRow, MegaBoostLegend } from "@/components/ui/MegaBoostRow";
import { CountersMegasChips } from "@/components/ui/CountersMegasRow";
import { CopyableInline } from "@/components/ui/Copyable";
import { MathTooltip } from "@/components/ui/MathTooltip";
import { RaidsNeededTooltip } from "@/components/ui/RaidsNeededTooltip";
import { BandBar, BAND_COLOR, BAND_LABEL } from "@/components/ui/BandBar";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { AllocationControl, AllocationBar } from "./AllocationControl";
import type { BlockAllocation } from "@/domain/types";

const DAY_LABEL: Record<EventDay, string> = { sat: "Saturday · Jul 11", sun: "Sunday · Jul 12" };

const blockKey = (b: BlockPlan) => `${b.day}${b.startHour}`;

/** Final-evolution species term from a boss name (e.g. "Mega Mewtwo X" → "Mewtwo"),
 *  so a block's priority order can be matched to mega species for tie-breaking. */
const speciesTerm = (name: string) =>
  name
    .replace(/^(Mega|Primal)\s+/, "")
    .replace(/\s+[XY]$/, "")
    .trim();

/** One species' target in a block: a drag grip, its plan numbers — planned in
 *  this block (editable; typing pins an exact count) / needed in this block ·
 *  species total for the whole week — the boss's types + candy-boost megas, and
 *  its best counters, plus a per-block quick-catch toggle. Completed raids are
 *  logged on the Results step's tracker, not here. */
function TargetCard({
  share,
  wildTypes,
  totalRange,
  grip,
  gripRight,
  rowRef,
  dragging,
  quickCatch,
  allocation,
}: {
  share: BlockSpeciesShare;
  wildTypes: string[];
  /** The species' whole-week raids range (from its BossResult) — the `t` in the
   *  planned/needed·total readout. */
  totalRange?: Range;
  grip?: ReactNode;
  /** A second grip on the right edge so the list is thumb-reachable either-handed. */
  gripRight?: ReactNode;
  rowRef?: (el: HTMLElement | null) => void;
  dragging?: boolean;
  quickCatch?: { on: boolean; onToggle: () => void };
  /** Per-target time allocation pin (absent for Mewtwo, which levels on its own). */
  allocation?: { alloc: BlockAllocation | undefined; need: number; onChange: (a: BlockAllocation | null) => void };
}) {
  const rewardCase = usePlannerStore((s) => s.settings.rewardCase);
  // For a multi-form species, show the forme available in THIS block (name/sprite/
  // counters); share.bossId stays the shared primary for result/progress linkage.
  const boss = getBoss(share.formeBossId ?? share.bossId);
  // Referentially stable per boss, so the memos below don't recompute every render.
  const types = useMemo(() => boss?.types ?? [], [boss]);
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
  const total = totalRange ? sized(totalRange, rewardCase) : 0;
  const goalPct = share.raids > 0 ? Math.round((share.fitted / share.raids) * 100) : 100;
  // Planned raids (k): a fixed pin shows the pinned count the instant it's
  // typed; otherwise the engine's fitted count for this block.
  const pinned = allocation?.alloc?.mode === "fixed";
  const planned = pinned ? (allocation?.alloc?.count ?? 0) : share.fitted;
  const setPlanned = (raw: string) => {
    if (!allocation) return;
    const v = Math.max(0, Math.round(Number(raw.replace(/[^\d]/g, "")) || 0));
    allocation.onChange({ mode: "fixed", count: v });
  };

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
          {allocation ? (
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={String(planned)}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setPlanned(e.target.value)}
              aria-label={`Raids planned for ${share.bossName} in this block`}
              title={
                pinned
                  ? "Raids planned here — pinned to this exact count (set the control below back to Priority to unpin)"
                  : "Raids planned here (auto from priority & time) — type to pin an exact count"
              }
              className={`w-10 rounded-sm border bg-gofest-bg/60 px-1 py-0.5 text-center outline-none focus:border-gofest-accent2 ${
                pinned ? "border-gofest-accent2/60 text-gofest-accent2" : "border-white/15 text-slate-100"
              }`}
            />
          ) : (
            <span className="w-10 text-center text-slate-100" title="Raids planned here (Mewtwo levels on its own)">
              {share.fitted}
            </span>
          )}
          <span className="text-slate-500">/</span>
          <span className="text-gofest-accent2">
            {share.mewtwo ? (
              <span title="Raids needed in this block (selected reward case)">{need}</span>
            ) : (
              <RaidsNeededTooltip
                bossId={share.bossId}
                label={`How ${share.bossName.replace(/^Mega /, "")}'s raids are counted`}
              >
                {need}
              </RaidsNeededTooltip>
            )}
          </span>
          {total > 0 ? (
            <span
              className="whitespace-nowrap text-[11px] font-semibold text-slate-500"
              title="Total raids this Pokémon needs across the whole week — the same number everywhere in the app"
            >
              · {total} total
            </span>
          ) : null}
        </div>

        {share.remaining > 0 ? (
          <MathTooltip
            label="Why the shortfall"
            hideIcon
            trigger={
              <span
                className="shrink-0 cursor-help whitespace-nowrap text-[12px] text-rose-300"
                title={`Only ${share.fitted} of ${share.raids} fit in time`}
              >
                <PixelIcon name="warning" size={11} /> {share.remaining} short
              </span>
            }
          >
            <div className="space-y-1 text-[13px] leading-relaxed text-slate-300">
              <p>
                You can fit <b className="text-slate-100">{share.fitted}</b> of the{" "}
                <b className="text-slate-100">{share.raids}</b> raids needed into this block&apos;s time —{" "}
                <b className="text-rose-300">{share.remaining} short</b> ({goalPct}% covered).
              </p>
              <p className="text-slate-500">Reprioritize, remote-raid, or trim the goal to close the gap.</p>
            </div>
          </MathTooltip>
        ) : null}
        {gripRight}
      </div>

      {/* Per-block quick-catch toggle + allocation control — sit below the name
          and above the counters. */}
      {quickCatch || allocation ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 pl-[36px]">
          {allocation ? (
            <AllocationControl alloc={allocation.alloc} need={allocation.need} onChange={allocation.onChange} />
          ) : null}
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
          <span className="inline-block w-[9ch] shrink-0 whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-gofest-acid">
            Counters
          </span>
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
          <span className="inline-block w-[9ch] shrink-0 whitespace-nowrap font-mono text-[11px] uppercase tracking-wider text-purple-300">
            Mega
          </span>
          <MegaBoostRow boosts={boosts} size={20} max={6} />
        </CopyableInline>
      ) : null}
    </div>
  );
}

const ZERO_BANDS: Record<RiskBand, number> = { blue: 0, green: 0, yellow: 0, red: 0 };

function BlockItem({ block, totals }: { block: BlockPlan; totals: Map<string, Range> }) {
  const [open, setOpen] = useExpandable(false);
  const onToggle = () => setOpen((o) => !o);
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
  const blockAllocs = usePlannerStore((s) => s.blockAllocations[key]);
  const setBlockAllocation = usePlannerStore((s) => s.setBlockAllocation);
  const setBlockAllocations = usePlannerStore((s) => s.setBlockAllocations);
  const clearBlockAllocations = usePlannerStore((s) => s.clearBlockAllocations);

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

  // Mewtwo levels itself across the weekend, so it isn't allocated here (yet).
  const allocatableIds = orderedIds.filter((id) => id !== MEWTWO_X_ID && id !== MEWTWO_Y_ID);
  const evenSplit = () => {
    const map: Record<string, BlockAllocation> = {};
    for (const id of allocatableIds) map[id] = { mode: "share", weight: 1 };
    setBlockAllocations(key, map);
  };

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
  const blockCounterSearch = useMemo(() => buildSearchString(blockCounters.map((c) => c.attacker.name)), [blockCounters]);

  return (
    // Themed by the block's three featured wild-spawn types — a colored enamel
    // frame + dark veil, exactly like the boss cards.
    <div className="cv-auto overflow-hidden rounded-lg p-[2px]" style={typeBackgroundStyle(wildTypes)}>
      <div className="rounded-[7px]" style={typePanelStyle(wildTypes)}>
        <button type="button" onClick={onToggle} aria-expanded={open} className="w-full px-2.5 py-2 text-left">
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="inline-flex items-center truncate">
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
            <span className="flex shrink-0 items-center gap-1.5">
              <span className={over ? "text-rose-300" : "text-slate-400"}>
                {block.fitted} raid{block.fitted === 1 ? "" : "s"}
                {over ? ` · ${block.remaining} won't fit` : free > 0 ? ` · ${free} to spare` : " · full"}
              </span>
              <PlusToggle open={open} size={12} className="text-slate-400" />
            </span>
          </div>
          <BandBar bands={block.bands} fitted={block.fitted} capacityMax={block.capacity.max} />
          {over ? (
            <p className="mt-1 text-[13px] font-medium text-rose-300">
              <PixelIcon name="warning" size={12} /> {block.remaining} {block.remaining === 1 ? "raid" : "raids"} can&apos;t
              fit this 3-hour block — tap for the per-Pokémon breakdown.
            </p>
          ) : null}
        </button>

        {open ? (
          <div className="space-y-1.5 border-t border-white/10 px-2.5 py-2" {...drag.containerProps}>
            <span aria-live="polite" role="status" className="sr-only">
              {drag.announcement}
            </span>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <p className="text-[12px] text-slate-500">
                Drag ⠿ to prioritise. Numbers read <b>planned here</b> / <b>needed here</b> · <b>week total</b> — type the
                first to pin it, or set shares below. Log finished raids on the Results step.
              </p>
              {allocatableIds.length >= 2 ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={evenSplit}
                    className="rounded border border-white/15 px-1.5 py-0.5 text-[11px] text-slate-300 hover:border-gofest-accent2 hover:text-white"
                    title="Split this block's time evenly across its targets"
                  >
                    Even split
                  </button>
                  {blockAllocs ? (
                    <button
                      type="button"
                      onClick={() => clearBlockAllocations(key)}
                      className="rounded border border-white/15 px-1.5 py-0.5 text-[11px] text-slate-400 hover:border-rose-400/60 hover:text-rose-200"
                      title="Clear all allocation pins — back to plain priority"
                    >
                      Reset
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {blockAllocs ? (
              <AllocationBar
                segments={block.species.map((s) => ({
                  bossId: s.bossId,
                  label: (getBoss(s.formeBossId ?? s.bossId)?.name ?? s.bossId).replace(/^Mega /, ""),
                  fitted: s.fitted,
                }))}
                capacityMax={block.capacity.max}
              />
            ) : null}
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
                  totalRange={totals.get(id)}
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
                  allocation={
                    share.mewtwo
                      ? undefined
                      : { alloc: blockAllocs?.[id], need: share.raids, onChange: (a) => setBlockAllocation(key, id, a) }
                  }
                />
              );
            })}
          </div>
        ) : null}

        {/* Block-wide best counters + megas to evolve — kept visible whether the
          block is expanded or collapsed (they vary block to block). */}
        <CountersMegasChips
          counters={blockCounters}
          counterSearch={blockCounterSearch}
          megas={topMegas}
          megaSearch={megaSearch}
        />
      </div>
    </div>
  );
}

/**
 * The weekend's habitat blocks as collapsible accordions. Each capacity bar is a
 * tap-to-expand header; the body lists one target card per species with its
 * planned-here (editable pin) / needed-here · week-total numbers. Bars fill to
 * 100% in priority order, reporting any shortfall rather than overflowing.
 * Region-locked targets are handled on the Remote step; completed raids are
 * logged on the Results step's tracker.
 */
export function BlockAccordion({ plan, results }: { plan: WeekendBlockPlan; results: BossResult[] }) {
  const setGlobalPriority = usePlannerStore((s) => s.setGlobalPriority);
  // Species week totals (the `t` in planned/needed·total) — one range per boss,
  // the same result every other step sizes its numbers from.
  const totals = useMemo(() => new Map(results.map((r) => [r.bossId, r.raids])), [results]);
  const byDay: { day: EventDay; blocks: BlockPlan[] }[] = [];
  for (const day of ["sat", "sun"] as EventDay[]) {
    const blocks = plan.blocks.filter((b) => b.day === day && b.demand > 0);
    if (blocks.length) byDay.push({ day, blocks });
  }
  if (!byDay.length) return null;

  // Smart order: rank every target by its AVERAGE required raids, fewest first,
  // so the quickest goals complete before capacity runs out (and the most goals
  // finish overall). Seeds every block's priority via setGlobalPriority.
  const smartPrioritize = () => {
    const order = [...results]
      .filter((r) => sized(r.raids, "expected") > 0)
      .sort((a, b) => sized(a.raids, "expected") - sized(b.raids, "expected") || a.bossId.localeCompare(b.bossId))
      .map((r) => r.bossId);
    setGlobalPriority(order);
  };

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
      <button
        type="button"
        onClick={smartPrioritize}
        title="Order every block by average raids needed — fewest first — so the most goals finish before time runs out"
        className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-gofest-accent2/50 bg-gofest-accent2/10 px-2.5 py-1 text-[12px] font-semibold text-gofest-accent2 transition hover:bg-gofest-accent2/20"
      >
        <PixelIcon name="sparkle" size={12} /> Smart auto-prioritize
      </button>
      <p className="mb-2 text-[12px] leading-snug text-slate-500">
        Each bar fills from <span className="text-sky-300">guaranteed</span> raids out to the{" "}
        <span className="text-rose-300">worst-case</span> if drops run cold (see key).
      </p>
      <div className="space-y-4">
        {byDay.map(({ day, blocks }) => (
          <div key={day}>
            <div className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-gofest-accent2">
              {DAY_LABEL[day]}
            </div>
            <div className="space-y-2">
              {blocks.map((b) => (
                <BlockItem key={blockKey(b)} block={b} totals={totals} />
              ))}
            </div>
          </div>
        ))}
      </div>
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
