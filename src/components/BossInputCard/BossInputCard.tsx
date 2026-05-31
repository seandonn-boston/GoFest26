"use client";

import type { BossResult, Currency, RaidBoss } from "@/domain/types";
import { formatNumber, formatRange } from "@/lib/format";
import { bossIsLocal, regionScopeLabel } from "@/domain/region";
import { describeAvailability, bossWindowSlots } from "@/data";
import { typeBackgroundStyle, typeIconList } from "@/data/typeVisuals";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Badge, TierBadge } from "@/components/ui/Badge";
import { NumberInput } from "@/components/ui/NumberInput";
import { Sprite } from "@/components/ui/Sprite";
import { PresetPicker } from "./PresetPicker";

const CURRENCY_LABELS: Record<Currency, string> = {
  candy: "Candy",
  xlCandy: "XL Candy",
  megaEnergy: "Mega Energy",
};

export function BossInputCard({
  boss,
  result,
  planningRaidsPerHour,
}: {
  boss: RaidBoss;
  result: BossResult;
  planningRaidsPerHour: number;
}) {
  const input = usePlannerStore((s) => s.inputs[boss.id]);
  const setVariant = usePlannerStore((s) => s.setVariant);
  const setCurrent = usePlannerStore((s) => s.setCurrent);
  const setTargetLevel = usePlannerStore((s) => s.setTargetLevel);
  const setTargetMegaLevel = usePlannerStore((s) => s.setTargetMegaLevel);
  const applyPreset = usePlannerStore((s) => s.applyPreset);
  const region = usePlannerStore((s) => s.settings.region);

  if (!input) return null;

  const isMega = boss.tier === "mega" || boss.tier === "super-mega";
  const wantsLeveling = boss.rewardsCurrencies.includes("xlCandy");
  const regionLabel = regionScopeLabel(boss.region);
  const remoteOnly = !bossIsLocal(boss, region);
  const windowSlots = bossWindowSlots(boss, planningRaidsPerHour);
  const overWindow = result.raidsNoBoost.min > windowSlots && windowSlots > 0;
  const needEntries = Object.entries(result.needs) as [Currency, { needed: number; raidsRange: { min: number; max: number } }][];

  const field = "rounded-lg border border-white/10 bg-gofest-bg/60 px-2 py-1.5 text-sm outline-none focus:border-gofest-accent2";

  return (
    <div className="relative rounded-2xl p-[3px]" style={typeBackgroundStyle(boss.types)}>
      <div className="absolute left-1/2 top-0 z-10 flex -translate-x-1/2 -translate-y-1/2 gap-1">
        {typeIconList(boss.types).map((ic, i) => (
          <span key={i} className="flex h-6 w-6 items-center justify-center rounded-full bg-gofest-bg text-sm ring-1 ring-white/25">
            {ic}
          </span>
        ))}
      </div>
      <div className="rounded-[14px] bg-gofest-panel p-3 pt-4">
      <div className="flex items-start gap-3">
        <Sprite src={boss.sprite} alt={boss.name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-semibold">{boss.name}</h3>
            <TierBadge tier={boss.tier} />
            {regionLabel ? <Badge>{regionLabel}</Badge> : null}
            {remoteOnly ? <Badge className="border-amber-400/40 text-amber-200">Remote</Badge> : null}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">🗓 {describeAvailability(boss)}</p>
        </div>
      </div>

      {boss.note ? <p className="mt-2 text-[11px] text-slate-400">💡 {boss.note}</p> : null}

      {/* Inputs */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {boss.rewardsCurrencies.map((c) => (
          <NumberInput
            key={c}
            label={CURRENCY_LABELS[c]}
            value={input.current[c]}
            onChange={(v) => setCurrent(boss.id, c, v)}
          />
        ))}
        {wantsLeveling ? (
          <>
            <NumberInput label="Level" value={input.current.level} min={1} max={50} step={0.5} onChange={(v) => setCurrent(boss.id, "level", v)} />
            <NumberInput label="→ Target lvl" value={input.target.level} min={1} max={50} step={0.5} onChange={(v) => setTargetLevel(boss.id, v)} />
          </>
        ) : null}
        {isMega ? (
          <>
            <NumberInput label="Mega lvl" value={input.current.megaLevel} min={0} max={4} onChange={(v) => setCurrent(boss.id, "megaLevel", v)} />
            <NumberInput label="→ Target mega" value={input.target.megaLevel} min={0} max={4} onChange={(v) => setTargetMegaLevel(boss.id, v)} />
          </>
        ) : null}
        {wantsLeveling ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-300">Variant</span>
            <select className={field} value={input.variant} onChange={(e) => setVariant(boss.id, e.target.value as typeof input.variant)}>
              <option value="standard">Standard</option>
              <option value="shadow">Shadow</option>
              <option value="purified">Purified</option>
            </select>
          </label>
        ) : null}
      </div>

      <div className="mt-2">
        <PresetPicker boss={boss} activePresetId={input.presetId} onApply={(id) => applyPreset(boss.id, id)} />
      </div>

      {/* Result */}
      <div className="mt-3 rounded-lg border border-white/10 bg-gofest-bg/40 p-2.5">
        {needEntries.length === 0 ? (
          <p className="text-xs text-emerald-300">✓ You already have everything for this goal.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <div>
                <span className="text-[10px] uppercase tracking-wide text-slate-400">Raids</span>
                <div className="text-xl font-bold text-gofest-accent2">{formatRange(result.raidsNoBoost)}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wide text-slate-400">w/ buddy</span>
                <div className="text-xl font-bold text-gofest-mewtwo">{formatRange(result.raidsWithBoost)}</div>
              </div>
              <span className="text-[11px] text-slate-400">
                {needEntries.map(([c, n]) => `${CURRENCY_LABELS[c]} ${formatNumber(n.needed)}`).join(" · ")}
              </span>
            </div>
            {overWindow ? (
              <p className="mt-1.5 text-[11px] text-rose-300">
                ⚠ More raids than its window allows (~{formatNumber(windowSlots)} max in {describeAvailability(boss)}). Trim the goal or spread across forms.
              </p>
            ) : null}
          </>
        )}
      </div>
      </div>
    </div>
  );
}
