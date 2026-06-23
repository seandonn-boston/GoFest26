"use client";

import { getBoss } from "@/data";
import { ROAD_DAYS } from "@/data/roadOfLegends";
import { energyGoalsForDay, ENERGY_ROAD_DAYS } from "@/data/energyGoals";
import { type RoadDayPlan, type RoadPlan, energyRaidsNeeded, energyRemaining } from "@/domain";
import { formatNumber, formatRange } from "@/lib/format";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Sprite } from "@/components/ui/Sprite";
import { BandBar } from "@/components/ui/BandBar";

const stripForme = (name: string) => name.replace(/^Mega /, "").replace(/\s*\(.*\)/, "");

const CURRENCY_CHIP: Record<string, string> = {
  candy: "Candy",
  xlCandy: "XL",
  megaEnergy: "Energy",
};

/** A featured target this day: sprite, name, raids fitted, and which rewards it gives. */
function RoadSpecies({ bossId, formeBossId, bossName, fitted }: { bossId: string; formeBossId?: string; bossName: string; fitted: number }) {
  const boss = getBoss(formeBossId ?? bossId);
  const rewards = boss?.rewardsCurrencies ?? ["candy", "xlCandy"];
  return (
    <div className="flex items-center gap-2 py-0.5">
      <Sprite src={boss?.sprite} alt={bossName} size={22} />
      <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{bossName.replace(/^Mega /, "")}</span>
      <div className="flex shrink-0 items-center gap-1">
        {rewards.map((c) => (
          <span key={c} className="rounded-sm border border-white/10 bg-white/[0.03] px-1 text-[9px] uppercase tracking-wide text-slate-400">
            {CURRENCY_CHIP[c]}
          </span>
        ))}
      </div>
      <span className="w-9 shrink-0 text-right font-mono text-sm font-bold text-gofest-accent2" title="Raids you'd do this day">
        {fitted}
      </span>
    </div>
  );
}

/** Fusion / Crowned / Primal raids featured this day, tied to the user's energy
 *  goals — shows the raids still needed when a goal is active, else a hint to
 *  enable it on the base Pokémon's card. */
function RoadDayEnergy({ roadDayId }: { roadDayId: string }) {
  const inputs = usePlannerStore((s) => s.inputs);
  const goals = energyGoalsForDay(roadDayId);
  if (goals.length === 0) return null;
  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
        ⚡ Fusion / Primal raids today
      </div>
      <div className="space-y-1">
        {goals.map(({ bossId, def }) => {
          const progress = inputs[bossId]?.energy?.[def.key];
          const on = progress?.on ?? false;
          const have = progress?.have ?? 0;
          const goal = progress && progress.goal > 0 ? progress.goal : def.cost;
          const remaining = energyRemaining(have, goal);
          const raids = energyRaidsNeeded(have, goal, def.perRaid);
          const boss = getBoss(bossId);
          return (
            <div key={`${bossId}-${def.key}`} className="flex items-center gap-2 text-[11px]">
              <Sprite src={boss?.sprite} alt={def.source} size={18} />
              <span className="min-w-0 flex-1 truncate text-slate-200">{def.source}</span>
              {on ? (
                remaining > 0 ? (
                  <span className="shrink-0 text-cyan-200">
                    ≈<b>{formatRange(raids)}</b> raids · {formatNumber(remaining)} to go
                  </span>
                ) : (
                  <span className="shrink-0 text-emerald-300">✓ enough banked</span>
                )
              ) : (
                <span className="shrink-0 text-slate-500">
                  {def.label} — enable on {stripForme(boss?.name ?? bossId)}&apos;s card
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoadDayCard({ day }: { day: RoadDayPlan }) {
  const over = day.remaining > 0;
  const used = day.species.filter((s) => s.fitted > 0);
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate">
          <span className="font-medium text-slate-200">{day.label}</span>
          <span className="ml-1.5 text-slate-500">
            {day.dateLabel} · Raid Hour {day.raidHourLabel}
          </span>
        </span>
        <span className={over ? "shrink-0 text-rose-300" : "shrink-0 text-slate-400"}>
          {day.fitted} raid{day.fitted === 1 ? "" : "s"}
          {over ? ` · ${day.remaining} over` : ""}
        </span>
      </div>
      {day.focus ? (
        <p className="mb-1 text-[10px] text-gofest-acid/90">
          🎯 Targeting <b>{day.focus.blockName}</b> — the weekend block with the most raids that won&apos;t fit (
          {day.focus.overflow} over), worked down its priority order.
        </p>
      ) : null}
      <BandBar height="h-2.5" bands={day.bands} fitted={day.fitted} capacityMax={day.capacity.max} />
      {used.length > 0 ? (
        <div className="mt-1.5 divide-y divide-white/[0.04]">
          {used.map((s) => (
            <RoadSpecies key={s.bossId} bossId={s.bossId} formeBossId={s.formeBossId} bossName={s.bossName} fitted={s.fitted} />
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-[11px] text-slate-500">None of your selected targets are featured this day.</p>
      )}
      <RoadDayEnergy roadDayId={day.id} />
    </div>
  );
}

/**
 * Road of Legends — a weekday day-picker that sits ABOVE the weekend habitat
 * blocks. Tick the days you'll raid (Mon Jul 6 → Fri Jul 10); each day's Raid
 * Hour budget is filled with your existing target selections, and whatever fits
 * is a head start that shrinks the weekend plan below.
 */
export function RoadOfLegends({ road }: { road: RoadPlan }) {
  const playDays = usePlannerStore((s) => s.playDays);
  const togglePlayDay = usePlannerStore((s) => s.togglePlayDay);

  return (
    <div className="mt-4 rounded-lg border border-gofest-acid/25 bg-gofest-acid/[0.04] p-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-gofest-acid">Road of Legends · raid week</h3>
        {road.totalFitted > 0 ? (
          <span className="shrink-0 text-[11px] text-emerald-300">★ {road.totalFitted}-raid head start</span>
        ) : null}
      </div>
      <p className="mb-2 text-[11px] text-slate-400">
        Pick the weekdays you&apos;ll raid the <b>Raid Hour</b> (6–7 PM local; Monday 6–8 PM). Your selected targets are poured
        into each day&apos;s budget — what fits is a head start that reduces your weekend below.
      </p>

      {/* Fusion / Crowned / Primal energy + Origin Dialga/Palkia notes — context
          that doesn't affect the head-start math but matters this week. */}
      <div className="mb-2 space-y-1.5 rounded-md border border-cyan-400/20 bg-cyan-400/[0.05] p-2 text-[11px] leading-relaxed text-slate-300">
        <p>
          <span className="font-semibold text-cyan-300">⚡ Fusion / Primal energy:</span> raid week also brings the
          special raids that drop it — <b>White / Black Kyurem</b>, <b>Dawn Wings / Dusk Mane Necrozma</b>,{" "}
          <b>Crowned Zacian / Zamazenta</b>, and <b>Primal Groudon / Kyogre</b>. Beat them to bank energy toward the
          fusion / crowned / primal goals on each base Pokémon&apos;s card (Kyurem, Necrozma, Zacian, Zamazenta,
          Groudon, Kyogre). Each energy comes from one specific raid on one day.
        </p>
        <p>
          <span className="font-semibold text-cyan-300">🗡 Origin Dialga &amp; Palkia (Fri):</span> they can be caught
          already knowing their signature moves <b>Roar of Time</b> / <b>Spatial Rend</b> — and for the first time an{" "}
          <b>Elite TM</b> can teach that move to an Origin Dialga / Palkia you already have, if you&apos;ve been wanting it.
        </p>
      </div>

      {/* Day-picker checkbox group. */}
      <div className="flex flex-wrap gap-1.5">
        {ROAD_DAYS.map((d) => {
          const on = !!playDays[d.id];
          return (
            <button
              key={d.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => togglePlayDay(d.id)}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[11px] transition ${
                on
                  ? "border-gofest-acid/60 bg-gofest-acid/15 text-white"
                  : "border-white/15 bg-gofest-bg/40 text-slate-300 hover:border-white/30"
              }`}
            >
              <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[9px] ${on ? "border-gofest-acid bg-gofest-acid text-black" : "border-white/30"}`}>
                {on ? "✓" : ""}
              </span>
              <span className="font-semibold">{d.label.slice(0, 3)}</span>
              <span className="text-slate-400">
                {d.dateLabel} · {d.raidHourHours}h
              </span>
              {ENERGY_ROAD_DAYS.has(d.id) ? (
                <span className="text-cyan-300" title="Fusion / Primal energy raids this day">⚡</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Per-day raid-hour plans (only for the days that are toggled on). */}
      {road.days.length > 0 ? (
        <div className="mt-3 space-y-2">
          {road.days.map((day) => (
            <RoadDayCard key={day.id} day={day} />
          ))}
          <p className="text-[10px] text-slate-500">
            During Road of Legends you get up to <b>2 free Raid Passes</b>/day, and Remote Raid Passes are <b>unlimited</b>{" "}
            (Jul 6–12) — so a raid hour is capped by time (≈{road.days[0]?.capacity.min}–{road.days[0]?.capacity.max} raids/hour),
            not passes.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-slate-500">No weekdays selected — your whole plan stays on the weekend.</p>
      )}
    </div>
  );
}
