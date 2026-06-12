"use client";

import { useState } from "react";
import { GAME_CONFIG } from "@/data/config";
import { getBoss } from "@/data";
import { RISK_BANDS } from "@/domain";
import type { BlockPlan, BlockSpeciesShare, RiskBand, WeekendBlockPlan } from "@/domain";
import type { EventDay } from "@/domain/types";
import { hourLabel } from "@/lib/format";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Sprite } from "@/components/ui/Sprite";

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
const doneKey = (b: BlockPlan, s: BlockSpeciesShare) => `${s.bossId}@${b.day}${b.startHour}`;

/** The block's capacity bar (colored confidence bands). The bar IS 100%; raids
 *  that don't fit are never drawn — they're reported as the shortfall below. */
function CapacityBar({ block }: { block: BlockPlan }) {
  const scale = Math.max(block.capacity.max, 1);
  const free = Math.max(0, block.capacity.max - block.fitted);
  const pct = (n: number) => `${(n / scale) * 100}%`;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-inset ring-white/10">
      {RISK_BANDS.map((b) =>
        block.bands[b] > 0 ? (
          <div key={b} className={BAND_COLOR[b]} style={{ width: pct(block.bands[b]) }} title={`${BAND_LABEL[b]}: ${block.bands[b]}`} />
        ) : null,
      )}
      {free > 0 ? <div style={{ width: pct(free) }} /> : null}
    </div>
  );
}

/** One species' target inside a block: completed (editable) / best · avg · worst. */
function TargetCard({ block, share }: { block: BlockPlan; share: BlockSpeciesShare }) {
  const key = doneKey(block, share);
  const done = usePlannerStore((s) => s.raidsDone[key] ?? 0);
  const setRaidsDone = usePlannerStore((s) => s.setRaidsDone);
  const boss = getBoss(share.bossId);

  const g = share.range.min; // best case
  const r = share.range.max; // worst case
  const y = Math.min(r, Math.max(g, Math.round((g + r) / 2))); // average
  const goalPct = share.raids > 0 ? Math.round((share.fitted / share.raids) * 100) : 100;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-gofest-bg/40 px-2 py-1.5">
      <Sprite src={boss?.sprite} alt={share.bossName} size={28} />
      <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{share.bossName.replace(/^Mega /, "")}</span>

      <div className="flex items-center gap-1 font-mono text-sm font-bold">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={done}
          onChange={(e) => setRaidsDone(key, Number(e.target.value))}
          aria-label={`Raids completed for ${share.bossName}`}
          className="w-10 rounded-sm border border-white/15 bg-gofest-bg/60 px-1 py-0.5 text-center text-slate-100 outline-none focus:border-gofest-accent2"
        />
        <span className="text-slate-500">/</span>
        <span className="text-emerald-400" title="Best case (fewest raids)">{g}</span>
        <span className="text-amber-400" title="Average">{y}</span>
        <span className="text-rose-400" title="Worst case (most raids)">{r}</span>
      </div>

      {share.remaining > 0 ? (
        <span className="shrink-0 text-[10px] text-rose-300" title={`${share.remaining} raids short this block`}>
          {goalPct}%
        </span>
      ) : null}
    </div>
  );
}

function BlockItem({ block, open, onToggle }: { block: BlockPlan; open: boolean; onToggle: () => void }) {
  const start = GAME_CONFIG.event.hourStartLocal;
  const free = Math.max(0, block.capacity.max - block.fitted);
  const over = block.remaining > 0;

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
        <CapacityBar block={block} />
        {over ? (
          <p className="mt-1 text-[11px] font-medium text-rose-300">
            ⚠ {block.remaining} raid{block.remaining === 1 ? "" : "s"} can&apos;t fit this 3-hour block — tap for the per-Pokémon breakdown.
          </p>
        ) : null}
      </button>

      {open ? (
        <div className="space-y-1.5 border-t border-white/10 px-2.5 py-2">
          {block.species.map((s) => (
            <TargetCard key={s.bossId + (s.mewtwo ? "-m" : "")} block={block} share={s} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The weekend's six habitat blocks as collapsible accordions. Each block's
 * capacity bar is the header (tap to open); the body lists one target card per
 * species — completed (editable) over its best/average/worst raid counts. The
 * bar fills to 100% in priority order, so a block that's over capacity reports
 * its shortfall and per-species achievability rather than overflowing.
 */
export function BlockAccordion({ plan }: { plan: WeekendBlockPlan }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
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
  if (!byDay.length) return null;

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
