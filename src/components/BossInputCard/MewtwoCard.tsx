"use client";

import { useEffect, useState } from "react";
import type { BossResult, Currency, RaidBoss } from "@/domain/types";
import { formatNumber, formatRange } from "@/lib/format";
import { usePlannerStore } from "@/store/usePlannerStore";
import { describeAvailability } from "@/data";
import { typeBackgroundStyle, typePanelStyle } from "@/data/typeVisuals";
import { NumberInput } from "@/components/ui/NumberInput";
import { PlusToggle } from "@/components/ui/PlusToggle";
import { megaBoostsForBoss, megaBoostSpecies, isL4Eligible } from "@/domain";
import { buildMegaSearchString } from "@/lib/pokemonSearch";
import { Sprite } from "@/components/ui/Sprite";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { MegaBoostRow, MegaBoostLegend } from "@/components/ui/MegaBoostRow";
import { Copyable } from "@/components/ui/Copyable";
import { ImageThumb } from "@/components/ui/ImageThumb";
import { energyForBosses } from "@/lib/screenshotScan";
import { CardScan } from "./CardScan";
import { MewtwoCopiesEditor } from "./MewtwoCopiesEditor";
import { MewtwoTitle } from "./MewtwoTitle";
import { CounterTable } from "./CounterTable";

const CURRENCY_LABELS: Record<Currency, string> = {
  candy: "Candy",
  xlCandy: "XL Candy",
  megaEnergy: "Mega Energy",
};

// Combined Mewtwo types (X is Psychic/Fighting, Y is Psychic).
const MEWTWO_TYPES = ["Psychic", "Fighting"];

/**
 * Combined card for Mega Mewtwo X & Y. They are separate raids (X on Saturday,
 * Y on Sunday) with separate Mega Energy, but share one underlying Mewtwo — so
 * Candy / XL / level are entered once (stored on the X input) while each form
 * has its own Mega Energy and Mega Level.
 */
export function MewtwoCard({
  bossX,
  bossY,
  resultX,
  resultY,
}: {
  bossX: RaidBoss;
  bossY: RaidBoss;
  resultX?: BossResult;
  resultY?: BossResult;
}) {
  const inputX = usePlannerStore((s) => s.inputs[bossX.id]);
  const inputY = usePlannerStore((s) => s.inputs[bossY.id]);
  const setCurrent = usePlannerStore((s) => s.setCurrent);
  const setSkipCatch = usePlannerStore((s) => s.setSkipCatch);
  const setMegaBuddy = usePlannerStore((s) => s.setMegaBuddy);
  const setL4Buddy = usePlannerStore((s) => s.setL4Buddy);
  const ensureMewtwoCopies = usePlannerStore((s) => s.ensureMewtwoCopies);
  const setScreenshot = usePlannerStore((s) => s.setScreenshot);
  const preview = usePlannerStore((s) => s.screenshots["mewtwo"]);
  const [open, setOpen] = useState(false); // collapsed by default (inputs hidden)

  const selectedX = !!inputX?.selected;
  const selectedY = !!inputY?.selected;
  const owner = selectedX ? inputX : inputY;
  const hasCopies = (owner?.copies?.length ?? 0) > 0;
  // The maxing editor is always shown — seed Mewtwo individual #1 once opened.
  useEffect(() => {
    if (open && (selectedX || selectedY) && !hasCopies) ensureMewtwoCopies();
  }, [open, selectedX, selectedY, hasCopies, ensureMewtwoCopies]);

  // Render whenever EITHER form is selected (selecting only X never creates the
  // Y input, and vice-versa). The per-form columns below are gated individually.
  if (!selectedX && !selectedY || !owner) return null;

  // The shared Mewtwo (candy/XL/level/variant) lives on a selected form so its
  // leveling is counted exactly once; prefer X when both are selected.
  const ownerId = selectedX ? bossX.id : bossY.id;

  return (
    <div className="enamel relative rounded-2xl p-2" style={typeBackgroundStyle(MEWTWO_TYPES)}>
      <div className="relative z-10 rounded-[12px] p-4" style={typePanelStyle(MEWTWO_TYPES)}>
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
            {MEWTWO_TYPES.map((t) => (
              <span key={t} className="rounded-full bg-black/50 ring-1 ring-white/25">
                <TypeIcon type={t} size={24} />
              </span>
            ))}
          </div>
          <div className="mb-3 mt-1.5 flex items-center justify-center gap-1.5 text-amber-200/70">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-amber-300/50" />
            <span className="text-[10px] leading-none">✦</span>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-amber-300/50" />
          </div>
          <MewtwoTitle spriteX={bossX.sprite} spriteY={bossY.sprite} />
          <p className="mb-3 mt-2 text-xs text-slate-400">
            One Mewtwo, two Mega forms. X appears <span className="text-slate-200">Saturday</span>, Y
            appears <span className="text-slate-200">Sunday</span>, and their Mega Energy is separate —
            so enter your shared Candy/XL/level once, then each form&apos;s energy and Mega Level.
          </p>
        </button>

        {!open ? null : (
        <>
        {/* On-hand pool — shared Candy/XL plus each form's Mega Energy. */}
        <div className="mb-4 rounded-xl border border-white/10 bg-gofest-bg/30 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gofest-accent2">
            How much Mewtwo candy do you already have?
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberInput label="Current Candy" value={owner.current.candy} onChange={(v) => setCurrent(ownerId, "candy", v)} />
            <NumberInput label="Current XL Candy" value={owner.current.xlCandy} onChange={(v) => setCurrent(ownerId, "xlCandy", v)} />
            {selectedX ? (
              <NumberInput label="Current Mega X Candy" value={inputX!.current.megaEnergy} onChange={(v) => setCurrent(bossX.id, "megaEnergy", v)} />
            ) : null}
            {selectedY ? (
              <NumberInput label="Current Mega Y Candy" value={inputY!.current.megaEnergy} onChange={(v) => setCurrent(bossY.id, "megaEnergy", v)} />
            ) : null}
          </div>
          {preview ? (
            <div className="mt-2 flex justify-end">
              <ImageThumb src={preview.src} alt="Mewtwo screenshot" size={48} />
            </div>
          ) : null}

          {/* Maxing section — always shown, with the screenshot uploader inline
              above the #1 / #2 priority tiles. */}
          <MewtwoCopiesEditor
            scanSlot={
              <CardScan
                expectedSpecies="mewtwo"
                bossLabel="Mega Mewtwo"
                onThumb={(thumb, capturedAt) => setScreenshot("mewtwo", thumb, capturedAt)}
                onApply={(s) => {
                  if (s.candy !== undefined) setCurrent(ownerId, "candy", s.candy);
                  if (s.xlCandy !== undefined) setCurrent(ownerId, "xlCandy", s.xlCandy);
                  const vals = energyForBosses(s.megaEnergies, [bossX, bossY]);
                  if (vals[0] !== undefined) setCurrent(bossX.id, "megaEnergy", vals[0]);
                  if (vals[1] !== undefined) setCurrent(bossY.id, "megaEnergy", vals[1]);
                }}
              />
            }
          />
        </div>

        {/* Per-form (only the forms you selected) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {selectedX ? (
            <FormColumn
              title="Mega Mewtwo X"
              subtitle={describeAvailability(bossX)}
              types={bossX.types}
              sprite={bossX.sprite}
              skipCatch={inputX!.skipCatch ?? false}
              megaBuddy={inputX!.megaBuddy ?? true}
              l4Buddy={inputX!.l4Buddy ?? false}
              l4Eligible={isL4Eligible(bossX)}
              onSkipCatch={(v) => setSkipCatch(bossX.id, v)}
              onMegaBuddy={(v) => setMegaBuddy(bossX.id, v)}
              onL4Buddy={(v) => setL4Buddy(bossX.id, v)}
              result={resultX}
              preUnlocked={!!bossX.goFestPreUnlocked}
            />
          ) : null}
          {selectedY ? (
            <FormColumn
              title="Mega Mewtwo Y"
              subtitle={describeAvailability(bossY)}
              types={bossY.types}
              sprite={bossY.sprite}
              skipCatch={inputY!.skipCatch ?? false}
              megaBuddy={inputY!.megaBuddy ?? true}
              l4Buddy={inputY!.l4Buddy ?? false}
              l4Eligible={isL4Eligible(bossY)}
              onSkipCatch={(v) => setSkipCatch(bossY.id, v)}
              onMegaBuddy={(v) => setMegaBuddy(bossY.id, v)}
              onL4Buddy={(v) => setL4Buddy(bossY.id, v)}
              result={resultY}
              preUnlocked={!!bossY.goFestPreUnlocked}
            />
          ) : null}
        </div>
        </>
        )}
      </div>
    </div>
  );
}

function FormColumn({
  title,
  subtitle,
  types,
  sprite,
  skipCatch,
  megaBuddy,
  l4Buddy,
  l4Eligible,
  onSkipCatch,
  onMegaBuddy,
  onL4Buddy,
  result,
  preUnlocked,
}: {
  title: string;
  subtitle: string;
  types?: string[];
  sprite?: string;
  skipCatch: boolean;
  megaBuddy: boolean;
  l4Buddy: boolean;
  l4Eligible: boolean;
  onSkipCatch: (v: boolean) => void;
  onMegaBuddy: (v: boolean) => void;
  onL4Buddy: (v: boolean) => void;
  result?: BossResult;
  preUnlocked: boolean;
}) {
  const needEntries = result
    ? (Object.entries(result.needs) as [Currency, { needed: number; raidsRange: { min: number; max: number } }][])
    : [];

  return (
    <div className="rounded-xl border border-white/10 bg-gofest-bg/30 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Sprite src={sprite} alt={title} size={32} />
        <div className="min-w-0">
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-[11px] text-slate-400">🗓 {subtitle}</div>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-[11px] text-slate-300">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" className="h-3 w-3 accent-gofest-accent2" checked={skipCatch} onChange={(e) => onSkipCatch(e.target.checked)} />
          Run from encounter
        </label>
        <label className={`flex items-center gap-1.5 ${skipCatch ? "opacity-40" : ""}`}>
          <input type="checkbox" className="h-3 w-3 accent-gofest-accent2" checked={megaBuddy} disabled={skipCatch} onChange={(e) => onMegaBuddy(e.target.checked)} />
          Mega buddy bonus
        </label>
        {l4Eligible ? (
          <label className={`flex items-center gap-1.5 ${skipCatch || !megaBuddy ? "opacity-40" : ""}`}>
            <input
              type="checkbox"
              className="h-3 w-3 accent-gofest-accent2"
              checked={l4Buddy}
              disabled={skipCatch || !megaBuddy}
              onChange={(e) => onL4Buddy(e.target.checked)}
            />
            Level-4 Mega active (+30% XL)
          </label>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-gofest-bg/40 p-2.5">
        {needEntries.length === 0 ? (
          <p className="text-xs text-emerald-300">✓ Nothing needed for this form.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-4">
              <div>
                <span className="text-[10px] uppercase tracking-wide text-slate-400">Raids needed</span>
                <div className="text-xl font-bold text-gofest-accent2">{formatRange(result!.raids)}</div>
              </div>
            </div>
            <ul className="mt-1 space-y-0.5 text-[11px] text-slate-400">
              {needEntries.map(([c, n]) => (
                <li key={c}>
                  {CURRENCY_LABELS[c]}: need <span className="text-slate-200">{formatNumber(n.needed)}</span> → {formatRange(n.raidsRange)} raids
                </li>
              ))}
            </ul>
          </>
        )}
        {preUnlocked ? (
          <p className="mt-1.5 text-[11px] text-slate-500">
            💡 Protip: GO Fest-caught Mewtwo start at ≥1 Mega Level (no 7,500 first-evolution cost) —
            set Mega lvl to 0 if you&apos;re evolving one you already own.
          </p>
        ) : null}
      </div>

      <CounterTable types={types} />

      {(() => {
        const boosts = megaBoostsForBoss(types ?? []);
        return boosts.length > 0 ? (
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
              Same-type as {title} — evolve one (Mega Level 3) before battling for bonus Candy XL.
            </p>
          </Copyable>
        ) : null;
      })()}
    </div>
  );
}
