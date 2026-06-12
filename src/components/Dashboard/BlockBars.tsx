"use client";

import { GAME_CONFIG } from "@/data/config";
import type { BlockPlan, RiskBand, WeekendBlockPlan } from "@/domain";
import type { EventDay } from "@/domain/types";
import { hourLabel } from "@/lib/format";

const BAND_COLOR: Record<RiskBand, string> = {
  blue: "bg-sky-500",
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-rose-500",
  grey: "bg-slate-600",
};

const BAND_LABEL: Record<RiskBand, string> = {
  blue: "Guaranteed",
  green: "Safe",
  yellow: "If candy runs short",
  red: "Bad-luck grind",
  grey: "Won't fit",
};

const FILL_BANDS: RiskBand[] = ["blue", "green", "yellow", "red"];
const DAY_LABEL: Record<EventDay, string> = { sat: "Saturday · Jul 11", sun: "Sunday · Jul 12" };

function BlockRow({ block }: { block: BlockPlan }) {
  const start = GAME_CONFIG.event.hourStartLocal;
  const nonGrey = FILL_BANDS.reduce((s, b) => s + block.bands[b], 0);
  const grey = block.bands.grey;
  const free = Math.max(0, block.capacity.max - nonGrey);
  const scale = nonGrey + free + grey || 1; // == max(capacity.max, demand)
  const pct = (n: number) => `${(n / scale) * 100}%`;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate">
          <span className="font-medium text-slate-200">{block.name}</span>
          <span className="ml-1.5 text-slate-500">
            {hourLabel(block.startHour, start)}–{hourLabel(block.endHour, start)}
          </span>
        </span>
        <span className={grey > 0 ? "shrink-0 text-rose-300" : "shrink-0 text-slate-400"}>
          {block.demand} raid{block.demand === 1 ? "" : "s"}
          {grey > 0 ? ` · ${grey} over` : free > 0 ? ` · ${free} to spare` : " · full"}
        </span>
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/5 ring-1 ring-inset ring-white/10">
        {FILL_BANDS.map((b) =>
          block.bands[b] > 0 ? (
            <div key={b} className={BAND_COLOR[b]} style={{ width: pct(block.bands[b]) }} title={`${BAND_LABEL[b]}: ${block.bands[b]}`} />
          ) : null,
        )}
        {free > 0 ? <div style={{ width: pct(free) }} /> : null}
        {grey > 0 ? (
          // Hatched grey overflow — past 100% of even the best-case pace.
          <div
            className="bg-slate-600/70"
            style={{
              width: pct(grey),
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.35) 3px, rgba(0,0,0,0.35) 6px)",
            }}
            title={`Won't fit: ${grey}`}
          />
        ) : null}
      </div>

      {block.species.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-500">
          {block.species.map((s) => (
            <span key={s.bossId + (s.mewtwo ? "-m" : "")} className={s.bands.grey === s.raids ? "text-slate-600 line-through" : ""}>
              {s.bossName.replace(/^Mega /, "")} ×{s.raids}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Per-habitat-block capacity bars. Each bar is the block's best-case raid
 * capacity; colored bands show how confident the player can be of finishing
 * each raid (blue guaranteed → red bad-luck grind), with a hatched overflow for
 * raids that won't fit. Reveals the wiggle room in every time block.
 */
export function BlockBars({ plan }: { plan: WeekendBlockPlan }) {
  const byDay: { day: EventDay; blocks: BlockPlan[] }[] = [];
  for (const day of ["sat", "sun"] as EventDay[]) {
    const blocks = plan.blocks.filter((b) => b.day === day && b.demand > 0);
    if (blocks.length) byDay.push({ day, blocks });
  }
  if (!byDay.length) return null;

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Per–time-block wiggle room</h3>
        <Legend />
      </div>
      <div className="space-y-4">
        {byDay.map(({ day, blocks }) => (
          <div key={day}>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gofest-accent2">
              {DAY_LABEL[day]}
            </div>
            <div className="space-y-2.5">
              {blocks.map((b) => (
                <BlockRow key={b.day + b.name} block={b} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">
        Mega Mewtwo is spread across blocks to even out your play time — its X energy stays Saturday, Y
        energy Sunday, while the XL-candy raids flow to whichever block has room.
      </p>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-400">
      {(["blue", "green", "yellow", "red", "grey"] as RiskBand[]).map((b) => (
        <span key={b} className="flex items-center gap-1">
          <span className={`inline-block h-2 w-2 rounded-sm ${BAND_COLOR[b]}`} />
          {BAND_LABEL[b]}
        </span>
      ))}
    </div>
  );
}
