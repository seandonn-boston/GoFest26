"use client";

import { useMemo, type ReactNode } from "react";
import { getBoss } from "@/data";
import type { BossInput, PokemonCopy } from "@/domain/types";
import { usePlannerStore, selectedInPriorityOrder } from "@/store/usePlannerStore";
import { useUiStore } from "@/store/useUiStore";
import { useDragList } from "./useDragList";
import { Sprite } from "@/components/ui/Sprite";

const speciesName = (id: string) => (getBoss(id)?.name ?? id).replace(/^Mega /, "");

/** A compact "what you're powering it up to" tag for one individual. */
function copyTarget(copy: PokemonCopy, isMega: boolean): string {
  return isMega ? `Mega Lv ${copy.target.megaLevel}` : `Lv ${copy.target.level}`;
}

interface Individual {
  /** Stable drag key, unique across the whole flat list. */
  key: string;
  bossId: string;
  /** null for a species with no materialized copies (one default individual). */
  copyId: string | null;
  label: string;
  sub?: string;
}

/** The individuals of one species: its materialized copies, or a single synthetic
 *  individual when the card hasn't been split into copies yet. */
function individualsFor(bossId: string, input: BossInput | undefined): Individual[] {
  const boss = getBoss(bossId);
  const isMega = boss?.tier === "mega" || boss?.tier === "super-mega";
  const name = speciesName(bossId);
  const copies = input?.copies ?? [];
  if (copies.length === 0) {
    return [{ key: `${bossId}::single`, bossId, copyId: null, label: name }];
  }
  return copies.map((c, i) => ({
    key: `${bossId}::${c.id}`,
    bossId,
    copyId: c.id,
    label: copies.length > 1 ? `${name} #${i + 1}` : name,
    sub: copyTarget(c, isMega),
  }));
}

/**
 * One drag-to-rank priority list over every selected target. Two views, toggled
 * by "Group by species":
 *   - OFF  → a single flat list of your individual Pokémon (mixed species). The
 *            top is served first; the bottom is cut first when the weekend can't
 *            fit everything.
 *   - ON   → individuals grouped under each species; drag a species to rank it as
 *            a whole, or drag a copy to rank it within its species.
 * Both views write to the same engine state: the species order (globalPriority,
 * which seeds every habitat block) and each species' copy order (which copy gets
 * the shared candy first). A per-block drag on the results step can still
 * override an individual block on top of this.
 */
export function PriorityList() {
  const inputs = usePlannerStore((s) => s.inputs);
  const globalPriority = usePlannerStore((s) => s.globalPriority);
  const grouped = useUiStore((s) => s.groupBySpecies);
  const setGrouped = useUiStore((s) => s.setGroupBySpecies);

  const speciesOrder = useMemo(
    () => selectedInPriorityOrder({ inputs, globalPriority }),
    [inputs, globalPriority],
  );

  if (speciesOrder.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Pick some targets in step 1 first — then rank them here.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="min-w-0 text-[11px] text-slate-500">
          Drag the ⠿ handle to rank. Highest is served first; the lowest is cut first if you can&apos;t
          fit everything.
        </p>
        <GroupToggle on={grouped} onToggle={() => setGrouped(!grouped)} />
      </div>

      {grouped ? (
        <GroupedView speciesOrder={speciesOrder} inputs={inputs} />
      ) : (
        <FlatView speciesOrder={speciesOrder} inputs={inputs} />
      )}
    </div>
  );
}

/** The off / group-species switch. */
function GroupToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      title="Group individuals under each species"
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
        on
          ? "border-gofest-accent2/60 bg-gofest-accent2/15 text-gofest-accent2"
          : "border-white/15 bg-white/[0.03] text-slate-400 hover:text-slate-200"
      }`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${on ? "bg-gofest-accent2" : "bg-slate-500"}`} />
      Group species
    </button>
  );
}

/* ----------------------------- Flat (off) view ---------------------------- */

function FlatView({ speciesOrder, inputs }: { speciesOrder: string[]; inputs: Record<string, BossInput> }) {
  const setGlobalPriority = usePlannerStore((s) => s.setGlobalPriority);
  const reorderCopies = usePlannerStore((s) => s.reorderCopies);

  // The flat order is derived from the engine state (species order × each
  // species' copy order), so what you see always matches what the plan will do.
  const items = useMemo(
    () => speciesOrder.flatMap((id) => individualsFor(id, inputs[id])),
    [speciesOrder, inputs],
  );
  const byKey = useMemo(() => new Map(items.map((it) => [it.key, it])), [items]);
  const order = items.map((it) => it.key);

  const onReorder = (keys: string[]) => {
    const seq = keys.map((k) => byKey.get(k)).filter((it): it is Individual => !!it);
    // Species rank = first appearance of any of its individuals.
    const speciesRank: string[] = [];
    for (const it of seq) if (!speciesRank.includes(it.bossId)) speciesRank.push(it.bossId);
    setGlobalPriority(speciesRank);
    // Within each species, the copies follow their relative order in the flat list.
    for (const id of speciesRank) {
      const copyIds = seq.filter((it) => it.bossId === id && it.copyId).map((it) => it.copyId as string);
      if (copyIds.length > 1) reorderCopies(id, copyIds);
    }
  };

  const drag = useDragList(order, onReorder);

  return (
    <div className="space-y-1.5" {...drag.containerProps}>
      {drag.list.map((key, i) => {
        const it = byKey.get(key);
        if (!it) return null;
        const boss = getBoss(it.bossId);
        return (
          <Row
            key={key}
            rowRef={(el) => drag.setRow(key, el)}
            dragging={drag.dragId === key}
            grip={<Grip {...drag.gripProps(key, it.label)} />}
            rank={i + 1}
            sprite={boss?.sprite}
            label={it.label}
            sub={it.sub}
          />
        );
      })}
    </div>
  );
}

/* -------------------------- Grouped (species) view ------------------------ */

function GroupedView({ speciesOrder, inputs }: { speciesOrder: string[]; inputs: Record<string, BossInput> }) {
  const setGlobalPriority = usePlannerStore((s) => s.setGlobalPriority);
  const drag = useDragList(speciesOrder, setGlobalPriority);

  return (
    <div className="space-y-2" {...drag.containerProps}>
      {drag.list.map((id, i) => (
        <SpeciesGroup
          key={id}
          bossId={id}
          input={inputs[id]}
          rank={i + 1}
          rowRef={(el) => drag.setRow(id, el)}
          dragging={drag.dragId === id}
          grip={<Grip {...drag.gripProps(id, speciesName(id))} />}
        />
      ))}
    </div>
  );
}

/** A species header (drag to rank the species) plus its individuals (drag to rank
 *  within the species). Own drag list for the copies — nested, but independent of
 *  the outer one (each only acts when its own grip starts the drag). */
function SpeciesGroup({
  bossId,
  input,
  rank,
  rowRef,
  dragging,
  grip,
}: {
  bossId: string;
  input: BossInput | undefined;
  rank: number;
  rowRef: (el: HTMLElement | null) => void;
  dragging: boolean;
  grip: ReactNode;
}) {
  const reorderCopies = usePlannerStore((s) => s.reorderCopies);
  const boss = getBoss(bossId);
  const isMega = boss?.tier === "mega" || boss?.tier === "super-mega";
  const copies = input?.copies ?? [];
  const copyIds = copies.map((c) => c.id);
  const drag = useDragList(copyIds, (ids) => reorderCopies(bossId, ids));

  return (
    <div
      ref={rowRef}
      className={`rounded-lg border bg-gofest-bg/40 transition-shadow ${
        dragging ? "border-gofest-accent2/70 shadow-brutal ring-1 ring-gofest-accent2" : "border-white/10"
      }`}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        {grip}
        <span className="w-5 shrink-0 text-center font-mono text-xs font-bold text-gofest-accent2">{rank}</span>
        <Sprite src={boss?.sprite} alt={speciesName(bossId)} size={28} />
        <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{speciesName(bossId)}</span>
        {copies.length > 1 ? (
          <span className="shrink-0 text-[10px] text-slate-500">{copies.length} individuals</span>
        ) : null}
      </div>

      {/* Within-species copy ranking — only when there's more than one to order. */}
      {copies.length > 1 ? (
        <div className="space-y-1 border-t border-white/10 px-2 py-1.5 pl-6" {...drag.containerProps}>
          {drag.list.map((cid, i) => {
            const idx = copies.findIndex((c) => c.id === cid);
            const c = copies[idx];
            if (!c) return null;
            return (
              <div
                key={cid}
                ref={(el) => drag.setRow(cid, el)}
                className={`flex items-center gap-2 rounded-md border bg-gofest-bg/40 px-2 py-1 transition-shadow ${
                  drag.dragId === cid ? "border-gofest-accent2/70 ring-1 ring-gofest-accent2" : "border-white/10"
                }`}
              >
                <Grip {...drag.gripProps(cid, `${speciesName(bossId)} #${i + 1}`)} small />
                <span className="w-4 shrink-0 text-center font-mono text-[10px] font-bold text-slate-400">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-slate-300">Individual #{i + 1}</span>
                <span className="shrink-0 text-[10px] text-slate-500">{copyTarget(c, isMega)}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------- Shared UI ------------------------------- */

function Grip({ small, ...props }: { small?: boolean } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={`flex shrink-0 cursor-grab touch-none select-none items-center justify-center rounded text-slate-500 outline-none focus-visible:ring-2 focus-visible:ring-gofest-accent2 active:cursor-grabbing ${
        small ? "h-6 w-4 text-xs" : "h-7 w-5"
      }`}
    >
      ⠿
    </span>
  );
}

function Row({
  rowRef,
  dragging,
  grip,
  rank,
  sprite,
  label,
  sub,
}: {
  rowRef: (el: HTMLElement | null) => void;
  dragging: boolean;
  grip: ReactNode;
  rank: number;
  sprite?: string;
  label: string;
  sub?: string;
}) {
  return (
    <div
      ref={rowRef}
      className={`flex items-center gap-2 rounded-lg border bg-gofest-bg/40 px-2 py-1.5 transition-shadow ${
        dragging ? "border-gofest-accent2/70 shadow-brutal ring-1 ring-gofest-accent2" : "border-white/10"
      }`}
    >
      {grip}
      <span className="w-5 shrink-0 text-center font-mono text-xs font-bold text-gofest-accent2">{rank}</span>
      <Sprite src={sprite} alt={label} size={28} />
      <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{label}</span>
      {sub ? <span className="shrink-0 text-[10px] text-slate-500">{sub}</span> : null}
    </div>
  );
}
