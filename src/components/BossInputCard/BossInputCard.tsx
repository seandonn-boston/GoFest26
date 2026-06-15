"use client";

import { useState } from "react";
import type { BossResult, Currency, RaidBoss } from "@/domain/types";
import { formatNumber, formatRange } from "@/lib/format";
import { bossIsLocal, regionScopeLabel } from "@/domain/region";
import { describeAvailability } from "@/data";
import { wildTypesForBoss } from "@/data/habitats";
import { megaBoostsForBoss, megaBoostSpecies, formMembers, planningWindows } from "@/domain";
import { buildMegaSearchString, pokemonSearchName } from "@/lib/pokemonSearch";
import { typeBackgroundStyle, typePanelStyle } from "@/data/typeVisuals";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Badge, TierBadge } from "@/components/ui/Badge";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { CyberTitle } from "@/components/ui/CyberTitle";
import { NumberInput } from "@/components/ui/NumberInput";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Sprite } from "@/components/ui/Sprite";
import { MegaBoostRow, MegaBoostLegend } from "@/components/ui/MegaBoostRow";
import { Copyable } from "@/components/ui/Copyable";
import { ImageThumb } from "@/components/ui/ImageThumb";
import { xlToMaxRemaining } from "@/lib/xlToMax";
import { speciesKey } from "@/lib/pokemonSearch";
import { energyForBosses } from "@/lib/screenshotScan";
import { PresetPicker } from "./PresetPicker";
import { CardScan } from "./CardScan";
import { CounterTable } from "./CounterTable";

const CURRENCY_LABELS: Record<Currency, string> = {
  candy: "Candy",
  xlCandy: "XL Candy",
  megaEnergy: "Mega Energy",
};

const VARIANT_LABEL = { standard: "Regular", shadow: "Shadow", purified: "Purified" } as const;

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
  const setCurrent = usePlannerStore((s) => s.setCurrent);
  const setQuantity = usePlannerStore((s) => s.setQuantity);
  const setScreenshot = usePlannerStore((s) => s.setScreenshot);
  const sKey = speciesKey(boss.name);
  const preview = usePlannerStore((s) => s.screenshots[sKey]);
  const setTargetLevel = usePlannerStore((s) => s.setTargetLevel);
  const setTargetMegaLevel = usePlannerStore((s) => s.setTargetMegaLevel);
  const setSkipCatch = usePlannerStore((s) => s.setSkipCatch);
  const setMegaBuddy = usePlannerStore((s) => s.setMegaBuddy);
  const applyPreset = usePlannerStore((s) => s.applyPreset);
  const region = usePlannerStore((s) => s.settings.region);
  const [open, setOpen] = useState(false); // cards start collapsed (inputs hidden)

  if (!input) return null;

  const isMega = boss.tier === "mega" || boss.tier === "super-mega";
  const wantsLeveling = boss.rewardsCurrencies.includes("xlCandy");
  const skipCatch = input.skipCatch ?? false;
  const megaBuddy = input.megaBuddy ?? true;
  const toMax = xlToMaxRemaining(input.current.level, input.current.xlCandy);
  const regionLabel = regionScopeLabel(boss.region);
  const remoteOnly = !bossIsLocal(boss, region);
  // Multi-form species: the card represents the whole group (one shared pool),
  // but counters / megas / availability stay per forme.
  const formes = boss.formGroup ? formMembers(boss.formGroup) : [boss];
  const isGroup = formes.length > 1;
  const displayName = isGroup ? pokemonSearchName(boss.name) : boss.name;
  // De-duplicate the union windows (same-day formes share a block) before counting
  // capacity, so a dual-day species (Dialga) counts both days but Giratina once.
  const planWindows = isGroup
    ? Array.from(
        new Map(planningWindows(boss).map((w) => [`${w.day}-${w.startHour}-${w.endHour}`, w])).values(),
      )
    : boss.windows;
  const windowSlots = planWindows.reduce((s, wd) => s + (wd.endHour - wd.startHour) * planningRaidsPerHour, 0);
  const overWindow = result.raids.min > windowSlots && windowSlots > 0;
  const needEntries = Object.entries(result.needs) as [Currency, { needed: number; raidsRange: { min: number; max: number } }][];

  return (
    <div className="enamel relative rounded-2xl p-2" style={typeBackgroundStyle(boss.types)}>
      <div className="relative z-10 rounded-[12px] p-3" style={typePanelStyle(boss.types)}>
      {/* Header — always shown; tapping it expands/collapses the inputs below. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="block w-full text-left"
      >
        <span
          aria-hidden
          className={`absolute right-2 top-2 text-slate-400 transition-transform ${open ? "rotate-90" : ""}`}
          title={open ? "Collapse" : "Expand"}
        >
          ▸
        </span>
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
              <CyberTitle name={displayName} types={boss.types} className="text-lg" />
              <TierBadge tier={boss.tier} />
              {regionLabel ? <Badge>{regionLabel}</Badge> : null}
              {remoteOnly ? <Badge className="border-gofest-accent/50 bg-gofest-accent/15 text-gofest-accent">Remote</Badge> : null}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              🗓 {formes.map((f) => `${isGroup ? `${f.formLabel}: ` : ""}${describeAvailability(f)}`).join(" · ")}
            </p>
            {isGroup ? (
              <p className="mt-0.5 text-[11px] text-amber-200/80">
                Both formes share one Candy pool — pick which to battle each block; rewards stack together.
              </p>
            ) : null}
          </div>
        </div>

        {boss.note ? <p className="mt-2 text-[11px] text-slate-400">💡 {boss.note}</p> : null}
      </button>

      {!open ? null : (
      <>
      <div className="mt-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <CardScan
            expectedSpecies={sKey}
            bossLabel={boss.name}
            onThumb={(thumb, capturedAt) => setScreenshot(sKey, thumb, capturedAt)}
            onApply={(s) => {
              if (s.candy !== undefined) setCurrent(boss.id, "candy", s.candy);
              if (s.xlCandy !== undefined) setCurrent(boss.id, "xlCandy", s.xlCandy);
              if (boss.rewardsCurrencies.includes("megaEnergy")) {
                const [v] = energyForBosses(s.megaEnergies, [boss]);
                if (v !== undefined) setCurrent(boss.id, "megaEnergy", v);
              }
            }}
          />
        </div>
        {preview ? <ImageThumb src={preview.src} alt={`${boss.name} screenshot`} size={56} /> : null}
      </div>

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

      {/* XL Candy still needed to max (40→50), computed from current level + XL. */}
      {wantsLeveling ? (
        <div className="mt-2">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">XL Candy to max (→ lvl 50)</div>
          <div className="grid grid-cols-3 gap-2">
            {(["standard", "shadow", "purified"] as const).map((v) => (
              <div key={v} className="rounded-sm border border-white/10 bg-gofest-bg/40 p-1.5 text-center">
                <div className="text-base font-bold text-gofest-accent2">{formatNumber(toMax[v])}</div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">{VARIANT_LABEL[v]}</div>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Remaining XL Candy to reach level 50 from your current level &amp; XL on hand.</p>
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
                ⚠ More raids than its window allows (~{formatNumber(windowSlots)} max in {describeAvailability(boss)}) — and
                bosses rotate hourly within a habitat, so you may get fewer. Trim the goal or spread across forms.
              </p>
            ) : null}
          </>
        )}
      </div>

      {/* Counters + mega suggestions, kept separate PER FORME (formes can differ).
          For a single-form boss this is just one section with no forme label. */}
      {formes.map((f) => {
        const boosts = megaBoostsForBoss(f.types ?? [], wildTypesForBoss(f));
        return (
          <div key={f.id} className={isGroup ? "mt-3 rounded-lg border border-white/10 p-2" : ""}>
            {isGroup ? (
              <div className="mb-1.5 flex items-center gap-1.5">
                <Sprite src={f.sprite} alt={f.name} size={20} />
                <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-amber-200/90">
                  {f.formLabel} forme
                </span>
              </div>
            ) : null}
            <CounterTable types={f.types} />
            {boosts.length > 0 ? (
              <Copyable
                search={buildMegaSearchString(megaBoostSpecies(boosts))}
                label="mega evolutions"
                className="mt-3 rounded-lg border border-purple-300/20 bg-purple-300/[0.05] p-2.5 transition hover:border-purple-300/40"
              >
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pr-8">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-purple-300">
                    Mega-evolve for candy
                  </span>
                  <MegaBoostLegend />
                </div>
                <MegaBoostRow boosts={boosts} max={8} />
                <p className="mt-1.5 text-[10px] text-slate-500">
                  Evolve one (Mega Level 3-4) before battling — its type matches {f.name}, so every raid &amp;
                  wild catch drops bonus Candy XL. Only one mega counts at a time.
                </p>
              </Copyable>
            ) : null}
          </div>
        );
      })}

      {/* Max out more than one — every requirement scales with the count. */}
      <div className="mt-2">
        <QuantityStepper value={input.quantity ?? 1} onChange={(n) => setQuantity(boss.id, n)} />
        {(input.quantity ?? 1) > 1 ? (
          <p className="mt-1 text-[10px] text-slate-500">
            Resources &amp; raids above are for {input.quantity} copies.
          </p>
        ) : null}
      </div>
      </>
      )}
      </div>
    </div>
  );
}
