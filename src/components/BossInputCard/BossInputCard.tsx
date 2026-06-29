"use client";

import { useEffect, useState } from "react";
import type { BossResult, Currency, RaidBoss } from "@/domain/types";
import { formatNumber, formatRange } from "@/lib/format";
import { bossIsLocal, regionScopeLabel } from "@/domain/region";
import { describeAvailability } from "@/data";
import { wildTypesForBoss } from "@/data/habitats";
import { megaBoostsForBoss, megaBoostSpecies, formMembers, planningWindows, groupDisplayName, isL4Eligible, explainCurrency } from "@/domain";
import { GAME_CONFIG } from "@/data/config";
import { MathTooltip } from "@/components/ui/MathTooltip";
import { ExplainEquation } from "@/components/ui/ExplainEquation";
import { buildMegaSearchString } from "@/lib/pokemonSearch";
import { typeBackgroundStyle, typePanelStyle } from "@/data/typeVisuals";
import { usePlannerStore } from "@/store/usePlannerStore";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { CardTitle } from "@/components/ui/CardTitle";
import { CardSpriteBackdrop } from "@/components/ui/CardSpriteBackdrop";
import { PlusToggle } from "@/components/ui/PlusToggle";
import { NumberInput } from "@/components/ui/NumberInput";
import { Sprite } from "@/components/ui/Sprite";
import { MegaBoostRow, MegaBoostLegend } from "@/components/ui/MegaBoostRow";
import { Copyable } from "@/components/ui/Copyable";
import { ImageThumb } from "@/components/ui/ImageThumb";
import { speciesKey } from "@/lib/pokemonSearch";
import { energyForBosses, fusionEnergyFromScan } from "@/lib/screenshotScan";
import { energyGoalsFor } from "@/data/energyGoals";
import { spriteUrl } from "@/data/bosses";
import { CardScan } from "./CardScan";
import { CounterTable } from "./CounterTable";
import { CopiesEditor } from "./CopiesEditor";
import { FusionEnergyPanel } from "./FusionEnergyPanel";

/** Labels for the result breakdown ("Candy 46"). */
const CURRENCY_LABELS: Record<Currency, string> = {
  candy: "Candy",
  xlCandy: "XL Candy",
  megaEnergy: "Mega Energy",
};

/** Labels for the on-hand pool inputs ("How much candy do you have?"). */
const INPUT_LABELS: Record<Currency, string> = {
  candy: "Current Candy",
  xlCandy: "Current XL Candy",
  megaEnergy: "Current Mega Candy",
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
  const setCurrent = usePlannerStore((s) => s.setCurrent);
  const ensureCopies = usePlannerStore((s) => s.ensureCopies);
  const setScreenshot = usePlannerStore((s) => s.setScreenshot);
  const sKey = speciesKey(boss.name);
  const preview = usePlannerStore((s) => s.screenshots[sKey]);
  const setMegaBuddy = usePlannerStore((s) => s.setMegaBuddy);
  const setL4Buddy = usePlannerStore((s) => s.setL4Buddy);
  const setEnergy = usePlannerStore((s) => s.setEnergy);
  const megaBuddyLevel = usePlannerStore((s) => s.settings.megaBuddyLevel);
  const calibration = usePlannerStore((s) => s.settings.calibration);
  const region = usePlannerStore((s) => s.settings.region);
  const [open, setOpen] = useState(false); // cards start collapsed (inputs hidden)

  // The maxing editor is always shown (even for one individual), so seed copy #1
  // from the single fields once the card is opened.
  const hasCopies = (input?.copies?.length ?? 0) > 0;
  useEffect(() => {
    if (open && input && !hasCopies) ensureCopies(boss.id);
  }, [open, input, hasCopies, boss.id, ensureCopies]);

  if (!input) return null;

  const isMega = boss.tier === "mega" || boss.tier === "super-mega";
  const megaBuddy = input.megaBuddy ?? true;
  const l4Buddy = input.l4Buddy ?? false;
  const l4Eligible = isL4Eligible(boss);
  // XL boost the global "assumed buddy level" implies (L1 default = +0%).
  const globalXlPct = Math.round((GAME_CONFIG.megaCatchBoost.xlByLevel[Math.min(3, Math.max(0, megaBuddyLevel))] ?? 0) * 100);
  const regionLabel = regionScopeLabel(boss.region);
  const remoteOnly = !bossIsLocal(boss, region);
  // Multi-form species: the card represents the whole group (one shared pool),
  // but counters / megas / availability stay per forme.
  const formes = boss.formGroup ? formMembers(boss.formGroup) : [boss];
  const isGroup = formes.length > 1;
  // Time-block availability line. When every forme shares the same time blocks
  // there's nothing to tell apart, so show it once; only label per forme
  // ("Altered: … · Origin: …") when the formes actually differ.
  const formeAvails = formes.map((f) => ({ label: f.formLabel ?? "", avail: describeAvailability(f) }));
  const sameAvail = new Set(formeAvails.map((a) => a.avail)).size === 1;
  const availabilityText =
    isGroup && !sameAvail
      ? formeAvails.map((a) => `${a.label}: ${a.avail}`).join(" · ")
      : describeAvailability(formes[0]);
  // Title with the bare species ("Zacian (Hero of Many Battles)" → "Zacian"); the
  // forme(s) ride in the pre-title.
  const displayName = isGroup ? groupDisplayName(boss) : boss.species ?? boss.name;
  const candySpecies = displayName.replace(/^Mega\s+/, "");
  // A cross-species shared-candy group (Solgaleo + Lunala) and a same-species
  // forme group (Giratina, the genies) both show every forme's sprite on the
  // card so both are visible; a lone boss shows just itself. Card theming uses
  // the union of every forme's types.
  // An energy-fusion boss (Necrozma, Kyurem) folds its fused formes' extra types
  // into the card styling + type-icon row — the same union treatment a multi-form
  // group (Solgaleo & Lunala) gets — so Necrozma shows Psychic/Ghost/Steel and
  // Kyurem Dragon/Ice/Fire/Electric.
  const fusedTypes = energyGoalsFor(boss.id).flatMap((g) => g.addedTypes ?? []);
  const cardTypes = isGroup
    ? Array.from(new Set(formes.flatMap((f) => f.types ?? [])))
    : Array.from(new Set([...(boss.types ?? []), ...fusedTypes]));
  const headerFormes = isGroup ? formes : [boss];
  // A same-species forme group titles with the species name, so its pre-title is
  // the formes (e.g. "Altered & Origin", "Incarnate & Therian"). A cross-species
  // group already names both in the title, so it keeps none.
  // Fused formes from Road of Legends: a boss with ONE fused forme (Groudon /
  // Kyogre → Primal, the Crowned genie-dogs) shows base on the left + fused on the
  // right. A boss with TWO fused formes (Kyurem, Necrozma) shows only its base for
  // now — its two fused sprites are deferred. Megas / plain 5★ have none; dual-forme
  // groups (Giratina, Solgaleo & Lunala, …) already fill both slots.
  const energyGoals = energyGoalsFor(boss.id);
  const fusedSprites = energyGoals
    .filter((g) => g.sprite)
    .map((g) => ({ src: spriteUrl(g.sprite as string), alt: g.source }));

  // Pre-title (where a Mega shows "Mega"): the formes. A same-species group shows
  // its formes ("Altered & Origin"); an energy-fusion boss shows its fused formes
  // + the base ("Black, White, Regular"; "Hero & Crowned"). Cross-species groups
  // already name both in the title, so they keep none.
  const sameSpeciesGroup = isGroup && new Set(formes.map((f) => speciesKey(f.name))).size === 1;
  const fusedFormes = energyGoals.map((g) => g.forme).filter((f): f is string => !!f).sort((a, b) => a.localeCompare(b));
  let formePretitle: string | undefined;
  if (sameSpeciesGroup) {
    formePretitle = formes.map((f) => f.formLabel ?? "").join(" & ");
  } else if (fusedFormes.length > 0) {
    const baseForme = boss.name.match(/\(([^)\s]+)/)?.[1] ?? "Regular";
    formePretitle =
      fusedFormes.length >= 2 ? `${fusedFormes.join(", ")}, ${baseForme}` : `${baseForme} & ${fusedFormes[0]}`;
  }
  const titleSprites =
    !isGroup && fusedSprites.length === 1
      ? [{ src: boss.sprite, alt: boss.name }, fusedSprites[0]]
      : headerFormes.map((f) => ({ src: f.sprite, alt: f.name }));
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
  // The step-by-step breakdown for a currency, but ONLY when it reproduces the
  // engine's displayed numbers — so the inline-editable math is never misleading
  // (e.g. collapsed multi-form groups whose shared pool differs are skipped).
  const explainFor = (c: Currency, n: { needed: number; raidsRange: { min: number; max: number } }) => {
    const ex = explainCurrency(boss, input, c, calibration, megaBuddyLevel);
    return ex && ex.needed === n.needed && ex.raids.min === n.raidsRange.min && ex.raids.max === n.raidsRange.max ? ex : null;
  };

  return (
    <div className="enamel relative rounded-2xl p-2" style={typeBackgroundStyle(cardTypes)}>
      <div className="relative z-10 overflow-hidden rounded-[12px]" style={typePanelStyle(cardTypes)}>
      <div className="card-text-legible relative z-10 p-3">
      {/* Header — always shown; tapping it expands/collapses the inputs below.
          The hero sprite(s) fill this header and centre vertically in it (= the
          collapsed card), so they don't move when the card opens; the card's
          overflow-hidden crops the overflow and expanding reveals the bottom. */}
      <div className="relative">
      <CardSpriteBackdrop sprites={titleSprites} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="block w-full text-left"
      >
        <span className="absolute right-3 top-3" title={open ? "Collapse" : "Expand"}>
          <PlusToggle open={open} size={22} className="text-slate-200" />
        </span>
        <div className="mt-1 flex justify-center gap-1">
          {cardTypes.map((t) => (
            <span key={t} className="rounded-full bg-black/50 ring-1 ring-white/25">
              <TypeIcon type={t} size={24} />
            </span>
          ))}
        </div>
        <div className="mb-3 mt-1.5 flex items-center justify-center gap-1.5 text-amber-200/70">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-300/50" />
          <span className="text-[12px] leading-none">✦</span>
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-300/50" />
        </div>

        <CardTitle
          name={displayName}
          types={cardTypes}
          isMega={isMega}
          pretitle={formePretitle}
        />

        {/* Sub-info on a liquid-glass pane, legible over any sprite behind it.
            Fixed line order: time block, then location (region), then tip. */}
        <div className="liquid-glass mx-auto mt-2 w-fit max-w-full rounded-2xl px-3 py-1.5">
          <p className="text-center text-[13px] font-medium text-slate-50">
            🗓️ {availabilityText}
          </p>
          {regionLabel || remoteOnly ? (
            <p className="mt-0.5 text-center text-[13px] font-medium text-slate-50">
              📍 {regionLabel ?? "Region-locked"}
              {remoteOnly ? <span className="text-gofest-accent"> · Remote</span> : null}
            </p>
          ) : null}
          {isGroup ? (
            <p className="mt-0.5 text-center text-[13px] font-medium text-amber-100">
              Both formes share one Candy pool — pick which to battle each block; rewards stack together.
            </p>
          ) : null}
          {boss.note ? (
            <p className="mt-0.5 text-center text-[13px] font-medium text-slate-50">💡 {boss.note}</p>
          ) : null}
        </div>
      </button>
      </div>

      {!open ? null : (
      <>
      {/* On-hand pool — how much of each currency you already have. */}
      <div className="mt-3">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gofest-accent2">
          How much {candySpecies} candy do you already have?
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {boss.rewardsCurrencies.map((c) => (
            <NumberInput
              key={c}
              label={INPUT_LABELS[c]}
              value={input.current[c]}
              onChange={(v) => setCurrent(boss.id, c, v)}
            />
          ))}
        </div>
        {preview ? (
          <div className="mt-2 flex justify-end">
            <ImageThumb src={preview.src} alt={`${boss.name} screenshot`} size={48} />
          </div>
        ) : null}
      </div>

      {/* Maxing section — always shown (≥1 individual), with the screenshot
          uploader sitting inline above the #1 / #2 priority tiles. */}
      <CopiesEditor
        boss={boss}
        input={input}
        scanSlot={
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
              // Tether scanned Fusion / Crowned / Primal energy to this boss's goals.
              const goals = energyGoalsFor(boss.id);
              if (goals.length > 0) {
                const have = fusionEnergyFromScan(s.megaEnergies, boss.name, goals);
                for (const [key, value] of Object.entries(have)) setEnergy(boss.id, key, { have: value });
              }
            }}
          />
        }
      />

      {/* Catch toggles (quick-catch / "run from encounter" now lives per-block on
          the results priority tiles, so it can vary block to block). */}
      <div className="mt-2 flex flex-col gap-1.5 text-xs text-slate-300">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-3.5 w-3.5 accent-gofest-accent2" checked={megaBuddy} onChange={(e) => setMegaBuddy(boss.id, e.target.checked)} />
          Mega buddy same-type bonus (+1 candy{globalXlPct > 0 ? `, +${globalXlPct}% XL` : ""}/catch)
        </label>
        {l4Eligible ? (
          <label className={`flex items-center gap-2 ${!megaBuddy ? "opacity-40" : ""}`}>
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-gofest-accent2"
              checked={l4Buddy}
              disabled={!megaBuddy}
              onChange={(e) => setL4Buddy(boss.id, e.target.checked)}
            />
            Catch with a Level-4 (Super Max) Mega active (+30% XL)
          </label>
        ) : null}
      </div>

      {/* Result */}
      <div className="mt-3 rounded-lg border border-white/10 bg-gofest-bg/40 p-2.5">
        {needEntries.length === 0 ? (
          <p className="text-xs text-emerald-300">✓ You already have everything for this goal.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <div>
                <span className="text-[12px] uppercase tracking-wide text-slate-400">Raids needed</span>
                <div className="text-xl font-bold text-gofest-accent2">
                  {(() => {
                    const bindExp = result.bindingCurrency
                      ? explainFor(result.bindingCurrency, result.needs[result.bindingCurrency]!)
                      : null;
                    return bindExp ? (
                      <MathTooltip label="How many raids and why" trigger={<span>{formatRange(result.raids)}</span>}>
                        <ExplainEquation bossId={boss.id} explanation={bindExp} />
                      </MathTooltip>
                    ) : (
                      formatRange(result.raids)
                    );
                  })()}
                </div>
              </div>
              <span className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-slate-400">
                {needEntries.map(([c, n], i) => {
                  const exp = explainFor(c, n);
                  const text = `${CURRENCY_LABELS[c]} ${formatNumber(n.needed)}`;
                  return (
                    <span key={c} className="inline-flex items-center">
                      {i > 0 ? <span className="mr-1.5 text-slate-600">·</span> : null}
                      {exp ? (
                        <MathTooltip label={`How ${CURRENCY_LABELS[c]} is calculated`} trigger={<span>{text}</span>}>
                          <ExplainEquation bossId={boss.id} explanation={exp} />
                        </MathTooltip>
                      ) : (
                        text
                      )}
                    </span>
                  );
                })}
              </span>
            </div>
            {overWindow ? (
              <p className="mt-1.5 text-[13px] text-rose-300">
                ⚠ More raids than its window allows (~{formatNumber(windowSlots)} max in {describeAvailability(boss)}) — and
                bosses rotate hourly within a habitat, so you may get fewer. Trim the goal or spread across forms.
              </p>
            ) : null}
          </>
        )}
      </div>

      {/* Fusion / Crowned / Primal energy goals (Kyurem, Necrozma, Zacian,
          Zamazenta, Groudon, Kyogre) — earned in Road of Legends week. */}
      <FusionEnergyPanel bossId={boss.id} bossName={boss.name} />

      {/* Counters + mega suggestions, kept separate PER FORME (formes can differ).
          For a single-form boss this is just one section with no forme label. */}
      {formes.map((f) => {
        const boosts = megaBoostsForBoss(f.types ?? [], wildTypesForBoss(f));
        return (
          <div key={f.id} className={isGroup ? "mt-3 rounded-lg border border-white/10 p-2" : ""}>
            {isGroup ? (
              <div className="mb-1.5 flex items-center gap-1.5">
                <Sprite src={f.sprite} alt={f.name} size={20} />
                <span className="font-mono text-[13px] font-bold uppercase tracking-widest text-amber-200/90">
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
                  <span className="font-mono text-[13px] font-bold uppercase tracking-widest text-purple-300">
                    Mega-evolve for candy
                  </span>
                  <MegaBoostLegend />
                </div>
                <MegaBoostRow boosts={boosts} max={8} />
                <p className="mt-1.5 text-[12px] text-slate-500">
                  Evolve one (Mega Level 3-4) before battling — its type matches {f.name}, so every raid &amp;
                  wild catch drops bonus Candy XL. Only one mega counts at a time.
                </p>
              </Copyable>
            ) : null}
          </div>
        );
      })}
      </>
      )}
      </div>
      </div>
    </div>
  );
}
