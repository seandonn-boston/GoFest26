"use client";

import type { EnergyGoalDef, EnergyKind } from "@/domain/types";
import { energyGoalsFor } from "@/data/energyGoals";
import { ROAD_DAYS } from "@/data/roadOfLegends";
import { energyRaidsNeeded, energyRemaining } from "@/domain";
import { formatNumber, formatRange } from "@/lib/format";
import { usePlannerStore } from "@/store/usePlannerStore";
import { NumberInput } from "@/components/ui/NumberInput";

const KIND_NOUN: Record<EnergyKind, string> = {
  fusion: "Fusion Energy",
  crowned: "Crowned Energy",
  primal: "Primal Energy",
};

const KIND_VERB: Record<EnergyKind, string> = {
  fusion: "fuse",
  crowned: "crown",
  primal: "revert",
};

const KIND_ACCENT: Record<EnergyKind, string> = {
  fusion: "border-cyan-400/30 bg-cyan-400/[0.06]",
  crowned: "border-amber-300/30 bg-amber-300/[0.06]",
  primal: "border-rose-400/30 bg-rose-400/[0.06]",
};

const DAY_BY_ID = new Map(ROAD_DAYS.map((d) => [d.id, d] as const));

function roadDayLabel(roadDayId?: string): string | null {
  const d = roadDayId ? DAY_BY_ID.get(roadDayId) : undefined;
  return d ? `${d.label} ${d.dateLabel}` : null;
}

function EnergyGoalRow({ bossId, def }: { bossId: string; def: EnergyGoalDef }) {
  const progress = usePlannerStore((s) => s.inputs[bossId]?.energy?.[def.key]);
  const setEnergy = usePlannerStore((s) => s.setEnergy);
  const on = progress?.on ?? false;
  const have = progress?.have ?? 0;
  const goal = progress?.goal && progress.goal > 0 ? progress.goal : def.cost;

  const dayLabel = roadDayLabel(def.roadDayId);
  const raids = energyRaidsNeeded(have, goal, def.perRaid);
  const remaining = energyRemaining(have, goal);

  return (
    <div className={`rounded-lg border px-2.5 py-2 ${on ? KIND_ACCENT[def.kind] : "border-white/10 bg-gofest-bg/40"}`}>
      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-200">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 accent-gofest-accent2"
          checked={on}
          // Seed the goal to the fuse/revert cost the first time it's switched on.
          onChange={(e) => setEnergy(bossId, def.key, { on: e.target.checked, goal })}
        />
        <span>
          Work toward <b>{def.label}</b>
        </span>
        <span className="ml-auto shrink-0 rounded-sm border border-white/10 px-1 text-[9px] uppercase tracking-wide text-slate-400">
          {KIND_NOUN[def.kind]}
        </span>
      </label>

      {on ? (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <NumberInput
              label="Energy on hand"
              value={have}
              onChange={(v) => setEnergy(bossId, def.key, { have: v })}
            />
            <NumberInput
              label={`Goal (to ${KIND_VERB[def.kind]})`}
              value={goal}
              min={0}
              onChange={(v) => setEnergy(bossId, def.key, { goal: v })}
            />
          </div>

          <div className="mt-2 rounded-md border border-white/10 bg-gofest-bg/40 p-2">
            {remaining <= 0 ? (
              <p className="text-xs text-emerald-300">✓ You already have enough to {KIND_VERB[def.kind]}.</p>
            ) : (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[10px] uppercase tracking-wide text-slate-400">Raids needed</span>
                <span className="text-lg font-bold text-gofest-accent2">{formatRange(raids)}</span>
                <span className="text-[11px] text-slate-400">
                  of <b className="text-slate-200">{def.source}</b>
                  {dayLabel ? ` · ${dayLabel}` : ""} · {formatNumber(remaining)} energy to go
                </span>
              </div>
            )}
          </div>

          <p className="mt-1 text-[10px] leading-snug text-slate-500">
            ~{def.perRaid.min}–{def.perRaid.max} energy per raid (more for faster, higher-damage wins); raids
            also drop Candy and a chance at XL Candy.{def.note ? ` ${def.note}` : ""}
          </p>
        </>
      ) : null}
    </div>
  );
}

/**
 * Fusion / Crowned / Primal energy goals for a base-form boss (Kyurem, Necrozma,
 * Zacian, Zamazenta, Groudon, Kyogre). Opt in per energy, enter what you hold
 * (auto-filled from a screenshot scan), and see the raids of the special forme
 * needed during Road of Legends week. Renders nothing for ordinary bosses.
 */
export function FusionEnergyPanel({ bossId, bossName }: { bossId: string; bossName: string }) {
  const goals = energyGoalsFor(bossId);
  if (goals.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-gofest-acid/25 bg-gofest-acid/[0.04] p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-gofest-acid">
          Fusion / Primal energy
        </span>
      </div>
      <p className="mb-2 text-[11px] text-slate-400">
        Optional — bank energy from {bossName}&apos;s special raids during <b>Road of Legends</b> week to build
        its alternate forme. Separate from your weekend maxing plan.
      </p>
      <div className="space-y-2">
        {goals.map((def) => (
          <EnergyGoalRow key={def.key} bossId={bossId} def={def} />
        ))}
      </div>
    </div>
  );
}
