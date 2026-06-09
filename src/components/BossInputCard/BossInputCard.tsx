"use client";

import type { BossResult, Currency, RaidBoss } from "@/domain/types";
import { formatNumber, formatRange } from "@/lib/format";
import { bossIsLocal, regionScopeLabel } from "@/domain/region";
import { describeAvailability, bossWindowSlots } from "@/data";
import { typeBackgroundStyle, typePanelStyle } from "@/data/typeVisuals";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Badge, TierBadge } from "@/components/ui/Badge";
import { TypeIcon } from "@/components/ui/TypeIcon";
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
  const setCount = usePlannerStore((s) => s.setCount);
  const setExtraXl = usePlannerStore((s) => s.setExtraXl);
  const setCurrent = usePlannerStore((s) => s.setCurrent);
  const setTargetLevel = usePlannerStore((s) => s.setTargetLevel);
  const setTargetMegaLevel = usePlannerStore((s) => s.setTargetMegaLevel);
  const setSkipCatch = usePlannerStore((s) => s.setSkipCatch);
  const setMegaBuddy = usePlannerStore((s) => s.setMegaBuddy);
  const applyPreset = usePlannerStore((s) => s.applyPreset);
  const region = usePlannerStore((s) => s.settings.region);

  if (!input) return null;

  const isMega = boss.tier === "mega" || boss.tier === "super-mega";
  const wantsLeveling = boss.rewardsCurrencies.includes("xlCandy");
  const skipCatch = input.skipCatch ?? false;
  const megaBuddy = input.megaBuddy ?? true;
  const counts = input.counts ?? { standard: 1, shadow: 0, purified: 0 };
  const extraXl = input.extraXl ?? 0;
  const regionLabel = regionScopeLabel(boss.region);
  const remoteOnly = !bossIsLocal(boss, region);
  const windowSlots = bossWindowSlots(boss, planningRaidsPerHour);
  const overWindow = result.raids.min > windowSlots && windowSlots > 0;
  const needEntries = Object.entries(result.needs) as [Currency, { needed: number; raidsRange: { min: number; max: number } }][];

  return (
    <div className="enamel relative rounded-2xl p-2" style={typeBackgroundStyle(boss.types)}>
      <div className="relative z-10 rounded-[12px] p-3" style={typePanelStyle(boss.types)}>
      <div className="mt-1 flex justify-center gap-1">
        {(boss.types ?? []).map((t) => (
          <span key={t} className="rounded-full bg-black/50 ring-1 ring-white/25">
            <TypeIcon type={t} size={24} />
          </span>
        ))}
      </div>
      <div className="mb-3 mt-1.5 flex items-center justify-center gap-1.5 text-amber-200/70">
        <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-300/50" />
        <span className="text-[10px] leading-none">✦</span>
        <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-300/50" />
      </div>
      <div className="flex items-start gap-3">
        <Sprite src={boss.sprite} alt={boss.name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-semibold">{boss.name}</h3>
            <TierBadge tier={boss.tier} />
            {regionLabel ? <Badge>{regionLabel}</Badge> : null}
            {remoteOnly ? <Badge className="border-gofest-accent/50 bg-gofest-accent/15 text-gofest-accent">Remote</Badge> : null}
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
      </div>

      {/* How many of each variant to take to the target level */}
      {wantsLeveling ? (
        <div className="mt-2">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">How many to max</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <NumberInput label="Regular (296)" value={counts.standard} min={0} max={99} onChange={(v) => setCount(boss.id, "standard", v)} />
            <NumberInput label="Shadow (360)" value={counts.shadow} min={0} max={99} onChange={(v) => setCount(boss.id, "shadow", v)} />
            <NumberInput label="Purified (272)" value={counts.purified} min={0} max={99} onChange={(v) => setCount(boss.id, "purified", v)} />
            <NumberInput label="+ Extra XL" value={extraXl} min={0} onChange={(v) => setExtraXl(boss.id, v)} />
          </div>
          {isMega ? (
            <p className="mt-1 text-[11px] text-slate-500">Shadow Pokémon can&apos;t Mega Evolve, so they add XL but no Mega Energy.</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2">
        <PresetPicker boss={boss} activePresetId={input.presetId} onApply={(id) => applyPreset(boss.id, id)} />
      </div>

      {/* Catch toggles */}
      <div className="mt-2 flex flex-col gap-1.5 text-xs text-slate-300">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-3.5 w-3.5 accent-gofest-accent2" checked={skipCatch} onChange={(e) => setSkipCatch(boss.id, e.target.checked)} />
          Run from encounter (raid rewards only — no catch candy/XL)
        </label>
        <label className={`flex items-center gap-2 ${skipCatch ? "opacity-40" : ""}`}>
          <input type="checkbox" className="h-3.5 w-3.5 accent-gofest-accent2" checked={megaBuddy} disabled={skipCatch} onChange={(e) => setMegaBuddy(boss.id, e.target.checked)} />
          Mega buddy same-type bonus (+1 candy/catch)
        </label>
      </div>

      {/* Result */}
      <div className="mt-3 rounded-lg border border-white/10 bg-gofest-bg/40 p-2.5">
        {needEntries.length === 0 ? (
          <p className="text-xs text-emerald-300">✓ You already have everything for this goal.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <div>
                <span className="text-[10px] uppercase tracking-wide text-slate-400">Raids needed</span>
                <div className="text-xl font-bold text-gofest-accent2">{formatRange(result.raids)}</div>
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
