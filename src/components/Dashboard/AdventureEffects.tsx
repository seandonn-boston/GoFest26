"use client";

import { useEffect, useMemo, useState } from "react";
import { ADVENTURE_EFFECTS } from "@/data/adventureEffects";
import { getBoss } from "@/data";
import { usePlannerStore } from "@/store/usePlannerStore";
import { NumberInput } from "@/components/ui/NumberInput";
import { Sprite } from "@/components/ui/Sprite";

const num = (n: number) => Math.round(n).toLocaleString();

/** "26 min" or "1 h 10 min". */
function fmtMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/**
 * Adventure Effects planner: pick an effect and how many times you'll use it,
 * and it totals the Stardust + species Candy that costs. The candy-on-hand field
 * pre-fills from what you entered for that species (base Candy, not XL), and the
 * shortfall becomes the Rare Candies you'd need to convert.
 */
export function AdventureEffects() {
  const inputs = usePlannerStore((s) => s.inputs);
  const [effectId, setEffectId] = useState(ADVENTURE_EFFECTS[0].id);
  const [uses, setUses] = useState(1);

  const effect = useMemo(() => ADVENTURE_EFFECTS.find((e) => e.id === effectId) ?? ADVENTURE_EFFECTS[0], [effectId]);

  // Candy you already hold for this species (base Candy), as entered on step 2.
  const storedCandy = effect.candyBossId ? Math.max(0, Math.round(inputs[effect.candyBossId]?.current?.candy ?? 0)) : 0;
  const hasStored = !!effect.candyBossId && !!inputs[effect.candyBossId];

  // Candy-on-hand field: seeded from the stored value, editable for a what-if.
  // Re-seed whenever the chosen effect (and thus its species) changes.
  const [candyOnHand, setCandyOnHand] = useState(storedCandy);
  useEffect(() => setCandyOnHand(storedCandy), [effectId, storedCandy]);

  const totalStardust = uses * effect.stardust;
  const totalCandy = uses * effect.candy;
  const totalMinutes = uses * effect.durationMinutes;
  const rareCandyNeeded = Math.max(0, totalCandy - candyOnHand);
  const candyCovered = rareCandyNeeded <= 0;

  const sprite = effect.candyBossId ? getBoss(effect.candyBossId)?.sprite : undefined;

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-slate-400">
        Adventure Effects are timed buffs a raid Pokémon can cast for <b>Stardust + that species&apos; Candy</b> (not XL).
        Pick one and how many times you&apos;ll use it to see what it costs.
      </p>

      {/* Effect picker */}
      <label className="block">
        <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-400">Effect</span>
        <select
          value={effectId}
          onChange={(e) => setEffectId(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-gofest-bg/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-gofest-accent2/60"
        >
          {ADVENTURE_EFFECTS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} — {e.species}
            </option>
          ))}
        </select>
      </label>

      {/* Details */}
      <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-gofest-bg/40 p-3">
        {sprite ? <Sprite src={sprite} alt={effect.species} size={40} /> : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold text-slate-100">{effect.name}</span>
            <span className="text-[12px] text-slate-500">{effect.species}</span>
          </div>
          <p className="mt-1 text-[13px] leading-snug text-slate-400">{effect.description}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-slate-400">
            <span>
              ⏱ <b className="text-slate-200">{effect.durationMinutes} min</b>/use
            </span>
            <span>
              ✦ <b className="text-sky-300">{num(effect.stardust)}</b> dust/use
            </span>
            <span>
              🍬 <b className="text-emerald-300">{effect.candy}</b> {effect.candyLabel} candy/use
            </span>
          </div>
        </div>
      </div>

      {/* Uses + candy on hand */}
      <div className="grid grid-cols-2 gap-3">
        <NumberInput label="Times you'll use it" value={uses} min={1} onChange={(v) => setUses(Math.max(1, v))} />
        <NumberInput label={`${effect.candyLabel} candy on hand`} value={candyOnHand} min={0} onChange={setCandyOnHand} />
      </div>
      <p className="-mt-1 text-[12px] text-slate-500">
        {hasStored
          ? `Pre-filled from the ${effect.candyLabel} candy you entered — edit for a what-if.`
          : `Enter how much ${effect.candyLabel} candy you hold to see the Rare Candies you'd need.`}
      </p>

      {/* Totals */}
      <div className="rounded-lg border border-gofest-accent2/25 bg-gofest-accent2/[0.04] p-3">
        <div className="text-[12px] text-slate-400">
          {uses}× {effect.name} = <b className="text-slate-200">{fmtMinutes(totalMinutes)}</b> of effect
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Stardust needed</div>
            <div className="text-xl font-bold text-sky-300">{num(totalStardust)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-400">{effect.candyLabel} candy needed</div>
            <div className="text-xl font-bold text-emerald-300">{num(totalCandy)}</div>
          </div>
        </div>
        <div className="mt-2 border-t border-white/10 pt-2 text-[13px]">
          {candyCovered ? (
            <span className="text-emerald-300">
              ✓ Your {num(candyOnHand)} candy covers all {uses} use{uses === 1 ? "" : "s"}
              {candyOnHand - totalCandy > 0 ? ` · ${num(candyOnHand - totalCandy)} left over` : ""}.
            </span>
          ) : (
            <span className="text-slate-300">
              After your {num(candyOnHand)} on hand, you&apos;d need <b className="text-amber-300">{num(rareCandyNeeded)}</b>{" "}
              Rare {rareCandyNeeded === 1 ? "Candy" : "Candies"} (1 Rare Candy = 1 {effect.candyLabel} candy).
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
