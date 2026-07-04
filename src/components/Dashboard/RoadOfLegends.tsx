"use client";

import { useMemo } from "react";
import { getBoss, GAME_CONFIG } from "@/data";
import { spriteUrl } from "@/data/bosses";
import { ROAD_DAYS } from "@/data/roadOfLegends";
import { energyGoalsFor, energyGoalsForDay } from "@/data/energyGoals";
import { type BlockSpeciesShare, type RoadDayPlan, type RoadPlan, energyRemaining } from "@/domain";
import { sized } from "@/domain/blockPlan";
import { bossIsLocal } from "@/domain/region";
import { primaryFormId, groupDisplayName } from "@/domain/forms";
import type { EnergyKind } from "@/domain/types";
import { formatNumber } from "@/lib/format";
import { usePlannerStore } from "@/store/usePlannerStore";
import { usePlannerResults } from "@/hooks/usePlannerResults";
import { Sprite } from "@/components/ui/Sprite";
import { BandBar } from "@/components/ui/BandBar";
import { Disclosure } from "@/components/ui/Disclosure";
import { RaidCountersMegas } from "@/components/ui/CountersMegasRow";
import { PixelIcon, type PixelIconName } from "@/components/ui/PixelIcon";
import { useDragList } from "./useDragList";

/** Featured boss ids per Road of Legends day (for the per-day target picker). */
const DAY_BOSSIDS: Record<string, string[]> = Object.fromEntries(ROAD_DAYS.map((d) => [d.id, d.bossIds]));

interface DayMeta {
  name: string;
  sprite?: string;
  energy: boolean;
}
interface RoadSelectCtx {
  inputs: ReturnType<typeof usePlannerStore.getState>["inputs"];
  region: ReturnType<typeof usePlannerStore.getState>["settings"]["region"];
  roadCoupled: boolean;
  roadSelected: Record<string, boolean>;
  roadEnergy: Record<string, string[]>;
}

/**
 * The day's eligible targets, split into fusion/primal ENERGY shares (which
 * default to the top) and featured roster CANDY targets, plus their display
 * meta. Shared by the per-day picker and the "smart auto-prioritize" seeder so
 * both agree on what's raidable that day and in what order.
 */
function dayEligible(
  dayId: string,
  ctx: RoadSelectCtx,
): { energyIds: string[]; candyIds: string[]; meta: Map<string, DayMeta> } {
  const meta = new Map<string, DayMeta>();
  const energyIds: string[] = [];
  for (const { bossId, def } of energyGoalsForDay(dayId)) {
    const active = ctx.roadCoupled
      ? (ctx.inputs[bossId]?.energy?.[def.key]?.on ?? false)
      : (ctx.roadEnergy[bossId] ?? []).includes(def.key);
    if (!active) continue;
    const id = `energy:${bossId}:${def.key}`;
    energyIds.push(id);
    meta.set(id, { name: def.source, sprite: def.sprite ? spriteUrl(def.sprite) : getBoss(bossId)?.sprite, energy: true });
  }
  const candyIds: string[] = [];
  const seen = new Set<string>();
  for (const id of DAY_BOSSIDS[dayId] ?? []) {
    const boss = getBoss(id);
    if (!boss) continue;
    const primary = boss.formGroup ? primaryFormId(boss.formGroup) : id;
    if (seen.has(primary)) continue;
    seen.add(primary);
    const pboss = getBoss(primary);
    if (!pboss || !bossIsLocal(pboss, ctx.region)) continue;
    const picked = ctx.roadCoupled ? !!ctx.inputs[primary]?.selected : !!ctx.roadSelected[primary];
    if (!picked) continue;
    candyIds.push(primary);
    meta.set(primary, { name: groupDisplayName(pboss), sprite: pboss.sprite, energy: false });
  }
  return { energyIds, candyIds, meta };
}

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
  const roadCoupled = usePlannerStore((s) => s.roadCoupled);
  const roadSelected = usePlannerStore((s) => s.roadSelected);
  const roadEnergy = usePlannerStore((s) => s.roadEnergy);

  // The day's reorderable targets, top-first: active fusion/primal raids (a goal
  // is toggled on) FIRST — they default above the rest — then the featured roster
  // targets you've picked and can raid locally. Membership follows the coupling
  // mode (coupled = weekend picks / card energy goals; decoupled = the RoL sets).
  const { eligible, meta } = useMemo(() => {
    const { energyIds, candyIds, meta } = dayEligible(dayId, { inputs, region, roadCoupled, roadSelected, roadEnergy });
    return { eligible: [...energyIds, ...candyIds], meta };
  }, [dayId, inputs, region, roadCoupled, roadSelected, roadEnergy]);

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
          const m = meta.get(id)!;
          const on = selectedSet.has(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              aria-pressed={on}
              className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-left text-[13px] transition ${
                on
                  ? m.energy
                    ? "border-orange-300/60 bg-orange-400/15 text-white shadow-[0_0_0_1px_rgba(251,146,60,0.35)]"
                    : "border-slate-300 bg-slate-300/15 text-white shadow-[0_0_0_1px_rgba(203,213,225,0.35)]"
                  : "border-white/15 bg-gofest-bg/40 text-slate-400 hover:border-white/35"
              }`}
            >
              <Sprite src={m.sprite} alt={m.name} size={26} />
              <span className="whitespace-nowrap">
                {m.energy ? (
                  <span aria-hidden className="mr-0.5 text-orange-300">
                    <PixelIcon name="bolt" size={12} />
                  </span>
                ) : null}
                {m.name}
              </span>
            </button>
          );
        })}
      </div>
      {effective.length >= 2 ? (
        <div className="mt-2" {...drag.containerProps}>
          <span aria-live="polite" role="status" className="sr-only">
            {drag.announcement}
          </span>
          <div className="space-y-1">
            {drag.list.map((id) => {
              const m = meta.get(id)!;
              return (
                <div
                  key={id}
                  ref={(el) => drag.setRow(id, el)}
                  className={`flex items-center gap-2 rounded-md border bg-gofest-bg/40 px-2 py-1 text-xs ${
                    drag.dragId === id ? "border-slate-300 ring-1 ring-slate-300" : "border-white/10"
                  }`}
                >
                  <span
                    {...drag.gripProps(id, m.name)}
                    className="flex h-6 w-5 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded text-slate-500 outline-none active:cursor-grabbing"
                  >
                    ⠿
                  </span>
                  <Sprite src={m.sprite} alt={m.name} size={20} />
                  <span className="truncate text-slate-200">
                    {m.energy ? (
                      <span aria-hidden className="mr-0.5 text-orange-300">
                        <PixelIcon name="bolt" size={12} />
                      </span>
                    ) : null}
                    {m.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Per-resource pixel badge for the day-picker, so each day's icons reflect the
// raid bosses + rewards on offer: Fusion (bolt), Crowned (crown), Primal
// (volcano), plus a gem for the day's featured Mega raid (Mega Energy).
interface DayBadge {
  icon: PixelIconName;
  color: string;
  title: string;
}
const ENERGY_KIND_BADGE: Record<EnergyKind, DayBadge> = {
  fusion: { icon: "bolt", color: "text-orange-300", title: "Fusion energy raids this day" },
  crowned: { icon: "crown", color: "text-amber-300", title: "Crowned energy raids this day" },
  primal: { icon: "volcano", color: "text-rose-300", title: "Primal energy raids this day" },
};
const MEGA_BADGE: DayBadge = { icon: "gem", color: "text-sky-300", title: "Featured Mega raid (Mega Energy) this day" };

/** The distinct resource icons available on a Road of Legends day. */
function dayBadges(dayId: string, bossIds: string[]): DayBadge[] {
  const out: DayBadge[] = [];
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

/** A fusion/primal energy raid row: the source forme, an Energy+Candy badge (it
 *  banks the base species' Candy too), and the raids you'd do this day. */
function EnergySpeciesRow({ share }: { share: BlockSpeciesShare }) {
  const roadCoupled = usePlannerStore((s) => s.roadCoupled);
  const progress = usePlannerStore((s) => s.inputs[share.bossId]?.energy?.[share.energyKey ?? ""]);
  const def = energyGoalsFor(share.bossId).find((d) => d.key === share.energyKey);
  const cost = def?.cost ?? 0;
  const have = roadCoupled ? (progress?.have ?? 0) : 0;
  const goal = roadCoupled ? (progress && progress.goal > 0 ? progress.goal : cost) : cost;
  const remaining = energyRemaining(have, goal);
  const sprite = share.sprite ? spriteUrl(share.sprite) : getBoss(share.bossId)?.sprite;
  return (
    <div className="flex items-center gap-2 py-0.5">
      <Sprite src={sprite} alt={share.bossName} size={22} />
      <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{share.bossName}</span>
      {/* A passive label of what this raid banks — NOT a toggle. Turn the goal on/
          off with its tile on step 1 (or the boss card); include/exclude it for a
          day with the pill at the top of this card. */}
      <span
        className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-500"
        title="This raid banks Fusion/Primal Energy toward the goal — plus the base Pokémon's Candy"
      >
        banks{" "}
        <span className="text-orange-300/90">
          <PixelIcon name="bolt" size={10} /> energy
        </span>{" "}
        <span className="text-slate-600">+</span> candy
      </span>
      <span
        className="w-9 shrink-0 text-right font-mono text-sm font-bold text-orange-400"
        title={remaining > 0 ? `${formatNumber(remaining)} energy to go` : "enough energy banked"}
      >
        {share.fitted}
      </span>
    </div>
  );
}

/** A per-day plan row: a fusion/primal energy raid, or a featured candy target. */
function RoadSpecies({ share }: { share: BlockSpeciesShare }) {
  if (share.energyKey) return <EnergySpeciesRow share={share} />;
  const boss = getBoss(share.formeBossId ?? share.bossId);
  const rewards = boss?.rewardsCurrencies ?? ["candy", "xlCandy"];
  return (
    <div className="flex items-center gap-2 py-0.5">
      <Sprite src={boss?.sprite} alt={share.bossName} size={22} />
      <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{share.bossName.replace(/^Mega /, "")}</span>
      {/* Passive "what this raid banks" label (not a toggle). */}
      <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-500" title="What this raid banks">
        banks {rewards.map((c) => CURRENCY_CHIP[c]).join(" + ")}
      </span>
      <span className="w-9 shrink-0 text-right font-mono text-sm font-bold text-orange-400" title="Raids you'd do this day">
        {share.fitted}
      </span>
    </div>
  );
}

function RoadDayCard({ day }: { day: RoadDayPlan }) {
  const over = day.remaining > 0;
  const used = day.species.filter((s) => s.fitted > 0);
  // Best counters + megas for the raids actually happening this day — hidden when
  // nothing is allocated. Raid-only window, so no habitat wild types.
  const raidBossIds = used.map((s) => s.formeBossId ?? s.bossId);
  // Featured bosses this day whose goal the concentrated Raid Hour can't finish —
  // but they keep spawning all day, so the user can keep raiding them to close the
  // gap. De-duped display names, in the order they appear.
  const stillOpen = Array.from(
    new Map(day.species.filter((s) => s.remaining > 0).map((s) => [s.bossId, s.bossName.replace(/^Mega /, "")])).values(),
  );
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
        <p className="mb-1 text-[12px] text-orange-400/90">
          <PixelIcon name="target" size={12} /> Targeting <b>{day.focus.blockName}</b> — the weekend block with the most
          raids that won&apos;t fit ({day.focus.overflow} over), worked down its priority order.
        </p>
      ) : null}
      <BandBar height="h-2.5" bands={day.bands} fitted={day.fitted} capacityMax={day.capacity.max} />
      {used.length > 0 ? (
        <div className="mt-1.5 divide-y divide-white/[0.04]">
          {used.map((s) => (
            <RoadSpecies key={s.energyKey ? `${s.bossId}-${s.energyKey}` : s.bossId} share={s} />
          ))}
        </div>
      ) : (
        <p className="mt-1.5 text-[13px] text-slate-500">None of your selected targets are featured this day.</p>
      )}
      {raidBossIds.length > 0 ? (
        <div className="mt-1.5">
          <RaidCountersMegas bossIds={raidBossIds} />
        </div>
      ) : null}
      {stillOpen.length > 0 ? (
        <p className="mt-1.5 text-[12px] leading-snug text-emerald-300/80">
          <PixelIcon name="clock" size={12} /> The Raid Hour can&apos;t finish these, but they&apos;re featured{" "}
          <b>all day</b> (≈6 AM–10 PM) — keep raiding <span className="text-emerald-200">{stillOpen.join(", ")}</span>{" "}
          {day.label} to close the gap.
        </p>
      ) : null}
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
  const inputs = usePlannerStore((s) => s.inputs);
  const region = usePlannerStore((s) => s.settings.region);
  const roadCoupled = usePlannerStore((s) => s.roadCoupled);
  const roadSelected = usePlannerStore((s) => s.roadSelected);
  const roadEnergy = usePlannerStore((s) => s.roadEnergy);
  const setRoadTargets = usePlannerStore((s) => s.setRoadTargets);
  const summary = usePlannerResults();

  // Average required raids per boss — drives the smart order (fewest first).
  const raidsById = useMemo(
    () => new Map(summary.results.map((r) => [r.bossId, sized(r.raids, "expected")])),
    [summary.results],
  );

  // Seed every day's order: fusion/primal ENERGY shares stay on top (the
  // energy-first default), then candy targets sorted fewest-raids-first so the
  // quickest pre-farms bank first. Writes into roadTargets, which the drag list
  // then lets the user override per day.
  const anyToOrder = ROAD_DAYS.some((d) => {
    const { energyIds, candyIds } = dayEligible(d.id, { inputs, region, roadCoupled, roadSelected, roadEnergy });
    return energyIds.length + candyIds.length >= 2;
  });
  const smartPrioritize = () => {
    for (const d of ROAD_DAYS) {
      const { energyIds, candyIds } = dayEligible(d.id, { inputs, region, roadCoupled, roadSelected, roadEnergy });
      if (energyIds.length + candyIds.length < 2) continue;
      const orderedCandy = [...candyIds].sort(
        (a, b) => (raidsById.get(a) ?? 0) - (raidsById.get(b) ?? 0) || a.localeCompare(b),
      );
      setRoadTargets(d.id, [...energyIds, ...orderedCandy]);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-orange-400/25 bg-orange-400/[0.04] p-3">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-orange-400">Road of Legends · raid week</h3>
        {road.totalFitted > 0 ? (
          <span className="shrink-0 text-[13px] text-emerald-300">★ {road.totalFitted}-raid head start</span>
        ) : null}
      </div>
      {anyToOrder ? (
        <button
          type="button"
          onClick={smartPrioritize}
          title="Order every day: fusion/primal energy first, then your candy targets by fewest raids needed. Drag to override any day."
          className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-orange-300/50 bg-orange-400/10 px-2.5 py-1 text-[12px] font-semibold text-orange-200 transition hover:bg-orange-400/20"
        >
          <PixelIcon name="sparkle" size={12} /> Smart auto-prioritize
        </button>
      ) : null}
      <p className="mb-2 text-[13px] text-slate-400">
        Pick the weekdays you&apos;ll raid the <b>Raid Hour</b> (6–8 PM local) — when the featured bosses take over{" "}
        <b>every</b> gym, so it&apos;s the fastest window. The bar shows how much of your goals that hour covers. But those
        bosses keep spawning as normal raids <b>all day</b> (≈6 AM–10 PM), so anything the hour can&apos;t finish you can
        keep chipping at that day — whatever you knock out is a head start that reduces your weekend below.
      </p>

      {/* Fusion / Crowned / Primal energy + Origin Dialga/Palkia notes — context
          that doesn't affect the head-start math, so it's tucked behind a
          disclosure to keep the interactive day picker up top. */}
      <div className="mb-2">
        <Disclosure
          title={
            <span className="font-semibold text-orange-300">
              <PixelIcon name="bolt" size={12} /> Fusion / Primal energy &amp; Origin move notes
            </span>
          }
          hint={<span className="text-slate-500">what to raid this week</span>}
        >
          <div className="space-y-1.5 text-[13px] leading-relaxed text-slate-300">
            <p>
              <span className="font-semibold text-orange-300">
                <PixelIcon name="bolt" size={12} /> Fusion / Primal energy:
              </span>{" "}
              raid week also brings the special raids that drop it — <b>White / Black Kyurem</b>,{" "}
              <b>Dawn Wings / Dusk Mane Necrozma</b>, <b>Crowned Zacian / Zamazenta</b>, and <b>Primal Groudon / Kyogre</b>.
              Beat them to bank energy toward the fusion / crowned / primal goals on each base Pokémon&apos;s card (Kyurem,
              Necrozma, Zacian, Zamazenta, Groudon, Kyogre). Each energy comes from one specific raid on one day.
            </p>
            <p>
              <span className="font-semibold text-orange-300">
                <PixelIcon name="sparkle" size={12} /> Origin Dialga &amp; Palkia (Fri):
              </span>{" "}
              they can be caught already knowing their signature moves <b>Roar of Time</b> / <b>Spatial Rend</b> — and for
              the first time an <b>Elite TM</b> can teach that move to an Origin Dialga / Palkia you already have, if
              you&apos;ve been wanting it.
            </p>
          </div>
        </Disclosure>
      </div>

      {/* Day-picker checkbox group. */}
      <div className="flex flex-wrap gap-1.5">
        {ROAD_DAYS.map((d) => {
          const on = !!playDays[d.id];
          return (
            <button
              key={d.id}
              type="button"
              aria-pressed={on}
              onClick={() => togglePlayDay(d.id)}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-[13px] transition ${
                on
                  ? "border-orange-400/60 bg-orange-400/15 text-white"
                  : "border-white/15 bg-gofest-bg/40 text-slate-300 hover:border-white/30"
              }`}
            >
              <span
                className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border text-[11px] ${on ? "border-orange-400 bg-orange-400 text-black" : "border-white/30"}`}
              >
                {on ? "✓" : ""}
              </span>
              <span className="font-semibold">{d.label.slice(0, 3)}</span>
              <span className="text-slate-400">
                {d.dateLabel} · {d.raidHourHours}h
              </span>
              {dayBadges(d.id, d.bossIds).map((b) => (
                <span key={b.title} title={b.title} className={b.color}>
                  <PixelIcon name={b.icon} size={12} />
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
            During Road of Legends you get up to <b>{GAME_CONFIG.passEconomy.freePassesPerRoadDay} free Raid Passes</b>/day,
            and Remote Raid Passes are <b>unlimited</b> (Jul 6–12) — so a raid hour is capped by time (≈
            {road.days[0]?.capacity.min}–{road.days[0]?.capacity.max} raids/hour), not passes.
          </p>
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-slate-500">No weekdays selected — your whole plan stays on the weekend.</p>
      )}
    </div>
  );
}
