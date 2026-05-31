"use client";

import type { BossResult, Currency, RaidBoss } from "@/domain/types";
import { formatNumber, formatRange } from "@/lib/format";
import { bossIsLocal, regionScopeLabel } from "@/domain/region";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Card } from "@/components/ui/Card";
import { Badge, TierBadge } from "@/components/ui/Badge";
import { NumberInput } from "@/components/ui/NumberInput";
import { PresetPicker } from "./PresetPicker";

const CURRENCY_LABELS: Record<Currency, string> = {
  candy: "Candy",
  xlCandy: "XL Candy",
  megaEnergy: "Mega Energy",
};

const CURRENT_FIELD: Record<Currency, "candy" | "xlCandy" | "megaEnergy"> = {
  candy: "candy",
  xlCandy: "xlCandy",
  megaEnergy: "megaEnergy",
};

export function BossInputCard({ boss, result }: { boss: RaidBoss; result: BossResult }) {
  const input = usePlannerStore((s) => s.inputs[boss.id]);
  const setVariant = usePlannerStore((s) => s.setVariant);
  const setCurrent = usePlannerStore((s) => s.setCurrent);
  const setTargetLevel = usePlannerStore((s) => s.setTargetLevel);
  const setTargetMegaLevel = usePlannerStore((s) => s.setTargetMegaLevel);
  const applyPreset = usePlannerStore((s) => s.applyPreset);
  const region = usePlannerStore((s) => s.settings.region);

  if (!input) return null;

  const isMega = boss.tier === "mega" || boss.tier === "super-mega";
  const hasMegaEnergy = boss.rewardsCurrencies.includes("megaEnergy");
  const wantsLeveling = boss.rewardsCurrencies.includes("xlCandy");
  const regionLabel = regionScopeLabel(boss.region);
  const remoteOnly = !bossIsLocal(boss, region);

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">{boss.name}</h3>
        <TierBadge tier={boss.tier} />
        {regionLabel ? <Badge>{regionLabel}</Badge> : null}
        {remoteOnly ? (
          <Badge className="border-amber-400/40 text-amber-200">Remote only</Badge>
        ) : null}
      </div>
      {remoteOnly ? (
        <p className="-mt-1 mb-2 text-xs text-amber-200/80">
          Not available near {region.label} — you&apos;ll need a Remote Raid Pass (or a friend hosting it).
        </p>
      ) : null}
      {boss.note ? <p className="-mt-1 mb-3 text-xs text-slate-400">💡 {boss.note}</p> : null}

      {/* Current holdings */}
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {boss.rewardsCurrencies.map((c) => (
          <NumberInput
            key={c}
            label={`Current ${CURRENCY_LABELS[c]}`}
            value={input.current[CURRENT_FIELD[c]]}
            onChange={(v) => setCurrent(boss.id, CURRENT_FIELD[c], v)}
          />
        ))}
      </div>

      {/* Pokémon level / mega level */}
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {wantsLeveling ? (
          <>
            <NumberInput
              label="Current level"
              value={input.current.level}
              min={1}
              max={50}
              step={0.5}
              onChange={(v) => setCurrent(boss.id, "level", v)}
            />
            <NumberInput
              label="Target level"
              value={input.target.level}
              min={1}
              max={50}
              step={0.5}
              onChange={(v) => setTargetLevel(boss.id, v)}
            />
          </>
        ) : null}
        {isMega ? (
          <>
            <NumberInput
              label="Current mega lvl"
              value={input.current.megaLevel}
              min={0}
              max={4}
              onChange={(v) => setCurrent(boss.id, "megaLevel", v)}
            />
            <NumberInput
              label="Target mega lvl"
              value={input.target.megaLevel}
              min={0}
              max={4}
              onChange={(v) => setTargetMegaLevel(boss.id, v)}
            />
          </>
        ) : null}
      </div>

      {/* Variant + presets */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        {wantsLeveling ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-300">Variant</span>
            <select
              className="rounded-lg border border-white/10 bg-gofest-bg/60 px-3 py-2 text-sm outline-none focus:border-gofest-accent2"
              value={input.variant}
              onChange={(e) => setVariant(boss.id, e.target.value as typeof input.variant)}
            >
              <option value="standard">Standard (296 XL)</option>
              <option value="shadow">Shadow (360 XL)</option>
              <option value="purified">Purified (272 XL)</option>
            </select>
          </label>
        ) : (
          <span />
        )}
        <PresetPicker boss={boss} activePresetId={input.presetId} onApply={(id) => applyPreset(boss.id, id)} />
      </div>

      {/* Result */}
      <ResultPanel boss={boss} result={result} hasMegaEnergy={hasMegaEnergy} />
    </Card>
  );
}

function ResultPanel({
  boss,
  result,
  hasMegaEnergy,
}: {
  boss: RaidBoss;
  result: BossResult;
  hasMegaEnergy: boolean;
}) {
  const needEntries = Object.entries(result.needs) as [Currency, { needed: number; raidsRange: { min: number; max: number } }][];
  const nothingNeeded = needEntries.length === 0;

  return (
    <div className="rounded-xl border border-white/10 bg-gofest-bg/40 p-3">
      {nothingNeeded ? (
        <p className="text-sm text-emerald-300">✓ You already have everything you need for this goal.</p>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-x-6 gap-y-1">
            <div>
              <span className="text-xs uppercase tracking-wide text-slate-400">Raids needed</span>
              <div className="text-2xl font-bold text-gofest-accent2">
                {formatRange(result.raidsNoBoost)}
              </div>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-slate-400">With mega buddy</span>
              <div className="text-2xl font-bold text-gofest-mewtwo">
                {formatRange(result.raidsWithBoost)}
              </div>
            </div>
            {result.bindingCurrency ? (
              <Badge className="self-end">limited by {CURRENCY_LABELS[result.bindingCurrency]}</Badge>
            ) : null}
          </div>
          <ul className="mt-2 space-y-0.5 text-xs text-slate-400">
            {needEntries.map(([c, n]) => (
              <li key={c}>
                {CURRENCY_LABELS[c]}: need <span className="text-slate-200">{formatNumber(n.needed)}</span>{" "}
                → {formatRange(n.raidsRange)} raids
              </li>
            ))}
          </ul>
          {hasMegaEnergy && boss.goFestPreUnlocked ? (
            <p className="mt-2 text-xs text-slate-500">
              GO Fest-caught {boss.name.replace("Mega ", "")} come pre-unlocked (≥1 mega level, no 7,500 first-evolution cost).
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
