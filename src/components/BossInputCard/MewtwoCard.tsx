"use client";

import type { BossResult, Currency, RaidBoss } from "@/domain/types";
import { formatNumber, formatRange } from "@/lib/format";
import { usePlannerStore } from "@/store/usePlannerStore";
import { describeAvailability } from "@/data";
import { typeBackgroundStyle, typePanelStyle } from "@/data/typeVisuals";
import { TierBadge } from "@/components/ui/Badge";
import { NumberInput } from "@/components/ui/NumberInput";
import { Sprite } from "@/components/ui/Sprite";
import { TypeIcon } from "@/components/ui/TypeIcon";

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
  const setCount = usePlannerStore((s) => s.setCount);
  const setExtraXl = usePlannerStore((s) => s.setExtraXl);
  const setTargetLevel = usePlannerStore((s) => s.setTargetLevel);
  const setTargetMegaLevel = usePlannerStore((s) => s.setTargetMegaLevel);
  const setSkipCatch = usePlannerStore((s) => s.setSkipCatch);
  const setMegaBuddy = usePlannerStore((s) => s.setMegaBuddy);

  const selectedX = !!inputX?.selected;
  const selectedY = !!inputY?.selected;
  // Render whenever EITHER form is selected (selecting only X never creates the
  // Y input, and vice-versa). The per-form columns below are gated individually.
  if (!selectedX && !selectedY) return null;

  // The shared Mewtwo (candy/XL/level/variant) lives on a selected form so its
  // leveling is counted exactly once; prefer X when both are selected.
  const ownerId = selectedX ? bossX.id : bossY.id;
  const owner = (selectedX ? inputX : inputY)!;
  const wantsLeveling = owner.target.level > owner.current.level;
  const counts = owner.counts ?? { standard: 1, shadow: 0, purified: 0 };
  const extraXl = owner.extraXl ?? 0;

  // XL/Candy are shared so we store extra XL on the owner only, but the
  // mega-energy gate (Shadow can't Mega Evolve) reads each form's own counts —
  // so variant counts are mirrored onto both X and Y.
  const setCountBoth = (variant: keyof typeof counts, value: number) => {
    setCount(bossX.id, variant, value);
    setCount(bossY.id, variant, value);
  };

  return (
    <div className="enamel relative rounded-2xl p-2" style={typeBackgroundStyle(MEWTWO_TYPES)}>
      <div className="relative z-10 rounded-[12px] p-4" style={typePanelStyle(MEWTWO_TYPES)}>
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
        <div className="mb-1 flex items-center gap-2">
          <Sprite src={bossX.sprite} alt="Mega Mewtwo X" size={40} />
          <Sprite src={bossY.sprite} alt="Mega Mewtwo Y" size={40} />
          <h3 className="text-base font-semibold">Mega Mewtwo X &amp; Y</h3>
          <TierBadge tier="super-mega" />
        </div>
        <p className="mb-3 text-xs text-slate-400">
          One Mewtwo, two Mega forms. X appears <span className="text-slate-200">Saturday</span>, Y
          appears <span className="text-slate-200">Sunday</span>, and their Mega Energy is separate —
          so enter your shared Candy/XL/level once, then each form&apos;s energy and Mega Level.
        </p>

        {/* Shared Mewtwo */}
        <div className="mb-4 rounded-xl border border-white/10 bg-gofest-bg/30 p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gofest-accent2">
            Shared Mewtwo
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberInput label="Current Candy" value={owner.current.candy} onChange={(v) => setCurrent(ownerId, "candy", v)} />
            <NumberInput label="Current XL Candy" value={owner.current.xlCandy} onChange={(v) => setCurrent(ownerId, "xlCandy", v)} />
            <NumberInput label="Current level" value={owner.current.level} min={1} max={50} step={0.5} onChange={(v) => setCurrent(ownerId, "level", v)} />
            <NumberInput label="Target level" value={owner.target.level} min={1} max={50} step={0.5} onChange={(v) => setTargetLevel(ownerId, v)} />
          </div>
          <div className="mt-3">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">How many to max</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <NumberInput label="Regular (296)" value={counts.standard} min={0} max={99} onChange={(v) => setCountBoth("standard", v)} />
              <NumberInput label="Shadow (360)" value={counts.shadow} min={0} max={99} onChange={(v) => setCountBoth("shadow", v)} />
              <NumberInput label="Purified (272)" value={counts.purified} min={0} max={99} onChange={(v) => setCountBoth("purified", v)} />
              <NumberInput label="+ Extra XL" value={extraXl} min={0} onChange={(v) => setExtraXl(ownerId, v)} />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Shadow Mewtwo can&apos;t Mega Evolve, so they add XL Candy but no Mega Energy — only your
              regular/purified Mewtwo drive the per-form energy below.
            </p>
          </div>
          {wantsLeveling ? (
            <p className="mt-2 text-xs text-slate-500">
              Leveling to {owner.target.level} (XL Candy) is counted under the form you raid, since
              you farm Mewtwo XL from those raids.
            </p>
          ) : null}
        </div>

        {/* Per-form (only the forms you selected) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {selectedX ? (
            <FormColumn
              title="Mega Mewtwo X"
              subtitle={describeAvailability(bossX)}
              sprite={bossX.sprite}
              energy={inputX!.current.megaEnergy}
              megaLevel={inputX!.current.megaLevel}
              targetMegaLevel={inputX!.target.megaLevel}
              onEnergy={(v) => setCurrent(bossX.id, "megaEnergy", v)}
              onMegaLevel={(v) => setCurrent(bossX.id, "megaLevel", v)}
              onTargetMegaLevel={(v) => setTargetMegaLevel(bossX.id, v)}
              skipCatch={inputX!.skipCatch ?? false}
              megaBuddy={inputX!.megaBuddy ?? true}
              onSkipCatch={(v) => setSkipCatch(bossX.id, v)}
              onMegaBuddy={(v) => setMegaBuddy(bossX.id, v)}
              result={resultX}
              preUnlocked={!!bossX.goFestPreUnlocked}
            />
          ) : null}
          {selectedY ? (
            <FormColumn
              title="Mega Mewtwo Y"
              subtitle={describeAvailability(bossY)}
              sprite={bossY.sprite}
              energy={inputY!.current.megaEnergy}
              megaLevel={inputY!.current.megaLevel}
              targetMegaLevel={inputY!.target.megaLevel}
              onEnergy={(v) => setCurrent(bossY.id, "megaEnergy", v)}
              onMegaLevel={(v) => setCurrent(bossY.id, "megaLevel", v)}
              onTargetMegaLevel={(v) => setTargetMegaLevel(bossY.id, v)}
              skipCatch={inputY!.skipCatch ?? false}
              megaBuddy={inputY!.megaBuddy ?? true}
              onSkipCatch={(v) => setSkipCatch(bossY.id, v)}
              onMegaBuddy={(v) => setMegaBuddy(bossY.id, v)}
              result={resultY}
              preUnlocked={!!bossY.goFestPreUnlocked}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FormColumn({
  title,
  subtitle,
  sprite,
  energy,
  megaLevel,
  targetMegaLevel,
  onEnergy,
  onMegaLevel,
  onTargetMegaLevel,
  skipCatch,
  megaBuddy,
  onSkipCatch,
  onMegaBuddy,
  result,
  preUnlocked,
}: {
  title: string;
  subtitle: string;
  sprite?: string;
  energy: number;
  megaLevel: number;
  targetMegaLevel: number;
  onEnergy: (v: number) => void;
  onMegaLevel: (v: number) => void;
  onTargetMegaLevel: (v: number) => void;
  skipCatch: boolean;
  megaBuddy: boolean;
  onSkipCatch: (v: boolean) => void;
  onMegaBuddy: (v: boolean) => void;
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
      <div className="grid grid-cols-3 gap-2">
        <NumberInput label="Mega Energy" value={energy} onChange={onEnergy} />
        <NumberInput label="Mega lvl" value={megaLevel} min={0} max={4} onChange={onMegaLevel} />
        <NumberInput label="Target lvl" value={targetMegaLevel} min={0} max={4} onChange={onTargetMegaLevel} />
      </div>

      <div className="mt-2 flex flex-col gap-1 text-[11px] text-slate-300">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" className="h-3 w-3 accent-gofest-accent2" checked={skipCatch} onChange={(e) => onSkipCatch(e.target.checked)} />
          Run from encounter
        </label>
        <label className={`flex items-center gap-1.5 ${skipCatch ? "opacity-40" : ""}`}>
          <input type="checkbox" className="h-3 w-3 accent-gofest-accent2" checked={megaBuddy} disabled={skipCatch} onChange={(e) => onMegaBuddy(e.target.checked)} />
          Mega buddy bonus
        </label>
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
            GO Fest-caught Mewtwo start at ≥1 Mega Level (no 7,500 first-evolution cost).
          </p>
        ) : null}
      </div>
    </div>
  );
}
