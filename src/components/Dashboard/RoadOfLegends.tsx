"use client";

import { useMemo } from "react";
import { getBoss, GAME_CONFIG } from "@/data";
import { spriteUrl } from "@/data/bosses";
import { ROAD_DAYS } from "@/data/roadOfLegends";
import { energyGoalsForDay } from "@/data/energyGoals";
import { type RoadDayPlan, type RoadPlan, energyRaidsNeeded, energyRemaining } from "@/domain";
import { bossIsLocal } from "@/domain/region";
import { primaryFormId, groupDisplayName } from "@/domain/forms";
import type { EnergyKind } from "@/domain/types";
import { formatNumber, formatRange } from "@/lib/format";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Sprite } from "@/components/ui/Sprite";
import { BandBar } from "@/components/ui/BandBar";
import { useDragList } from "./useDragList";

/** Featured boss ids per Road of Legends day (for the per-day target picker). */
const DAY_BOSSIDS: Record<string, string[]> = Object.fromEntries(ROAD_DAYS.map((d) => [d.id, d.bossIds]));

/**
 * Per-day target picker: silver selection tiles for the targets featured this day
 * that you've picked for the weekend (and can raid locally), plus a drag list to
 * order them. Selection + order are stored per day; a day you haven't touched
 * defaults to all eligible targets in weekend-priority order.
 */
function RoadDaySelect({ dayId }: { dayId: string }) {
  const inputs = usePlannerStore((s) => s.inputs);
  const region = usePlannerStore((s) => s.settings.region);
  const roadTargets = usePlannerStore((s) => s.roadTargets);
  const setRoadTargets = usePlannerStore((s) => s.setRoadTargets);

  // Eligible = featured this day (collapsed to the primary forme), selected for
  // the weekend, and raidable in person (region-locked targets stay weekend/remote).
  const eligible = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of DAY_BOSSIDS[dayId] ?? []) {
      const boss = getBoss(id);
      if (!boss) continue;
      const primary = boss.formGroup ? primaryFormId(boss.formGroup) : id;
      if (seen.has(primary)) continue;
      seen.add(primary);
      const pboss = getBoss(primary);
      if (!pboss || !inputs[primary]?.selected || !bossIsLocal(pboss, region)) continue;
      out.push(primary);
    }
    return out;
  }, [dayId, inputs, region]);

  const explicit = roadTargets[dayId];
  // Effective selection: the user's explicit list (kept to still-eligible ids), or
  // all eligible when they haven't touched this day.
  const effective = (explicit ?? eligible).filter((id) => eligible.includes(id));
  const selectedSet = new Set(effective);
  const drag = useDragList(effective, (ids) => setRoadTargets(dayId, ids));

  const toggle = (id: string) => {
    const cur = explicit ?? eligible;
    setRoadTargets(dayId, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  };

  if (eligible.length === 0) {
    return (
      <p className="mb-2 text-[13px] text-slate-500">
        None of your picked targets are featured this day. Pick more on step 1 to pre-farm them here.
      </p>
    );
  }

  return (
    <div className="mb-2">
      <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-400">Targets to pre-farm</div>
      <div className="flex flex-wrap gap-2">
        {eligible.map((id) => {
          const boss = getBoss(id);
          const on = selectedSet.has(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              aria-pressed={on}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-left text-[13px] transition ${
                on
                  ? "border-slate-300 bg-slate-300/15 text-white shadow-[0_0_0_1px_rgba(203,213,225,0.35)]"
                  : "border-white/15 bg-gofest-bg/40 text-slate-400 hover:border-white/35"
              }`}
            >
              <Sprite src={boss?.sprite} alt={boss?.name ?? id} size={26} />
              <span className="whitespace-nowrap">{boss ? groupDisplayName(boss) : id}</span>
            </button>
          );
        })}
      </div>
      {effective.length >= 2 ? (
        <div className="mt-2" {...drag.containerProps}>
          <p className="mb-1 text-[12px] text-slate-500">Drag to set this day&apos;s priority (top is raided first).</p>
          <div className="space-y-1">
            {drag.list.map((id) => {
              const boss = getBoss(id);
              return (
                <div
                  key={id}
                  ref={(el) => drag.setRow(id, el)}
                  className={`flex items-center gap-2 rounded-md border bg-gofest-bg/40 px-2 py-1 text-xs ${
                    drag.dragId === id ? "border-slate-300 ring-1 ring-slate-300" : "border-white/10"
                  }`}
                >
                  <span
                    {...drag.gripProps(id, boss ? groupDisplayName(boss) : id)}
                    className="flex h-6 w-5 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded text-slate-500 outline-none active:cursor-grabbing"
                  >
                    ⠿
                  </span>
                  <Sprite src={boss?.sprite} alt={boss?.name ?? id} size={20} />
                  <span className="truncate text-slate-200">{boss ? groupDisplayName(boss) : id}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const stripForme = (name: string) => name.replace(/^Mega /, "").replace(/\s*\(.*\)/, "");

// Per-resource chip badge for the day-picker, so each day's icons reflect the
// raid bosses + rewards on offer: Fusion ⚡, Crowned 👑, Primal 🌋, plus a 🔷 for
// the day's featured Mega raid (Mega Energy).
const ENERGY_KIND_BADGE: Record<EnergyKind, { icon: string; title: string }> = {
  fusion: { icon: "⚡", title: "Fusion energy raids this day" },
  crowned: { icon: "👑", title: "Crowned energy raids this day" },
  primal: { icon: "🌋", title: "Primal energy raids this day" },
};
const MEGA_BADGE = { icon: "🔷", title: "Featured Mega raid (Mega Energy) this day" };

/** The distinct resource icons available on a Road of Legends day. */
function dayBadges(dayId: string, bossIds: string[]): { icon: string; title: string }[] {
  const out: { icon: string; title: string }[] = [];
  const seen = new Set<EnergyKind>();
  for (const { def } of energyGoalsForDay(dayId)) {
    if (!seen.has(def.kind)) {
      seen.add(def.kind);
      out.push(ENERGY_KIND_BADGE[def.kind]);
    }
  }
  if (bossIds.some((id) => getBoss(id)?.tier === "mega")) out.push(MEGA_BADGE);
  return out;
}

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
          <span key={c} className="rounded-sm border border-white/10 bg-white/[0.03] px-1 text-[11px] uppercase tracking-wide text-slate-400">
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
  const roadCoupled = usePlannerStore((s) => s.roadCoupled);
  const roadEnergy = usePlannerStore((s) => s.roadEnergy);
  const goals = energyGoalsForDay(roadDayId);
  if (goals.length === 0) return null;
  return (
    <div className="mt-2 border-t border-white/10 pt-2">
      <div className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-cyan-300">
        ⚡ Fusion / Primal raids today
      </div>
      <p className="mb-1 text-[11px] text-slate-500">
        Day-locked — only earnable today. These raids also bank the base Pokémon&apos;s Candy, so they count toward its
        goal too.
      </p>
      <div className="space-y-1">
        {goals.map(({ bossId, def }) => {
          // Coupled: read the weekend energy goal (have/goal editable on the card).
          // Decoupled: read the independent roadEnergy set — a fixed fuse-cost intent.
          const progress = inputs[bossId]?.energy?.[def.key];
          const on = roadCoupled ? progress?.on ?? false : (roadEnergy[bossId] ?? []).includes(def.key);
          const have = roadCoupled ? progress?.have ?? 0 : 0;
          const goal = roadCoupled ? (progress && progress.goal > 0 ? progress.goal : def.cost) : def.cost;
          const remaining = energyRemaining(have, goal);
          const raids = energyRaidsNeeded(have, goal, def.perRaid);
          const boss = getBoss(bossId);
          // The actual raid is the fused / crowned / primal forme, not the base.
          const sprite = def.sprite ? spriteUrl(def.sprite) : boss?.sprite;
          return (
            <div key={`${bossId}-${def.key}`} className="flex items-center gap-2 text-[13px]">
              <Sprite src={sprite} alt={def.source} size={18} />
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
                  {def.label} — enable on {roadCoupled ? `${stripForme(boss?.name ?? bossId)}'s card` : "the Road of Legends tiles"}
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
      <RoadDaySelect dayId={day.id} />
      {day.focus ? (
        <p className="mb-1 text-[12px] text-gofest-acid/90">
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
        <p className="mt-1.5 text-[13px] text-slate-500">None of your selected targets are featured this day.</p>
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
          <span className="shrink-0 text-[13px] text-emerald-300">★ {road.totalFitted}-raid head start</span>
        ) : null}
      </div>
      <p className="mb-2 text-[13px] text-slate-400">
        Pick the weekdays you&apos;ll raid the <b>Raid Hour</b> (6–8 PM local): <b>6–7</b> is 5★ raids (Monday&apos;s is the
        whole roster), <b>7–8</b> is a single featured Mega — except <b>Friday</b>, whose 7–8 is <b>Primal Kyogre &amp;
        Groudon</b>. Your selected targets are poured into each day&apos;s budget — what fits is a head start that reduces
        your weekend below.
      </p>

      {/* Fusion / Crowned / Primal energy + Origin Dialga/Palkia notes — context
          that doesn't affect the head-start math but matters this week. */}
      <div className="mb-2 space-y-1.5 rounded-md border border-cyan-400/20 bg-cyan-400/[0.05] p-2 text-[13px] leading-relaxed text-slate-300">
        <p>
          <span className="font-semibold text-cyan-300">⚡ Fusion / Primal energy:</span> raid week also brings the
          special raids that drop it — <b>White / Black Kyurem</b>, <b>Dawn Wings / Dusk Mane Necrozma</b>,{" "}
          <b>Crowned Zacian / Zamazenta</b>, and <b>Primal Groudon / Kyogre</b>. Beat them to bank energy toward the
          fusion / crowned / primal goals on each base Pokémon&apos;s card (Kyurem, Necrozma, Zacian, Zamazenta,
          Groudon, Kyogre). Each energy comes from one specific raid on one day.
        </p>
        <p>
          <span className="font-semibold text-cyan-300">🌌 Origin Dialga &amp; Palkia (Fri):</span> they can be caught
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
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[13px] transition ${
                on
                  ? "border-gofest-acid/60 bg-gofest-acid/15 text-white"
                  : "border-white/15 bg-gofest-bg/40 text-slate-300 hover:border-white/30"
              }`}
            >
              <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[11px] ${on ? "border-gofest-acid bg-gofest-acid text-black" : "border-white/30"}`}>
                {on ? "✓" : ""}
              </span>
              <span className="font-semibold">{d.label.slice(0, 3)}</span>
              <span className="text-slate-400">
                {d.dateLabel} · {d.raidHourHours}h
              </span>
              {dayBadges(d.id, d.bossIds).map((b) => (
                <span key={b.title} title={b.title}>
                  {b.icon}
                </span>
              ))}
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
          <p className="text-[12px] text-slate-500">
            During Road of Legends you get up to <b>{GAME_CONFIG.passEconomy.freePassesPerRoadDay} free Raid Passes</b>/day, and Remote Raid Passes are <b>unlimited</b>{" "}
            (Jul 6–12) — so a raid hour is capped by time (≈{road.days[0]?.capacity.min}–{road.days[0]?.capacity.max} raids/hour),
            not passes.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-slate-500">No weekdays selected — your whole plan stays on the weekend.</p>
      )}
    </div>
  );
}
