"use client";

import type { ReactNode } from "react";
import { usePlannerStore } from "@/store/usePlannerStore";
import { perMewtwoCopyNeeds } from "@/domain";
import { MEWTWO_X_ID, MEWTWO_Y_ID } from "@/data";
import type { Variant } from "@/domain/types";
import { NumberInput } from "@/components/ui/NumberInput";
import { formatNumber } from "@/lib/format";

const VARIANTS: { id: Variant; label: string }[] = [
  { id: "standard", label: "Reg" },
  { id: "shadow", label: "Shadow" },
  { id: "purified", label: "Purified" },
];

const iconBtn =
  "flex h-5 w-5 items-center justify-center rounded border border-white/15 text-[13px] text-slate-300 transition hover:border-gofest-accent2/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-30";

/**
 * Editor for maxing several distinct Mewtwo — each with its own Pokémon level
 * and INDEPENDENT X and Y mega levels (a caught Mewtwo only ever has one branch
 * pre-unlocked, so raising one current zeroes the other). The four shared pools
 * (Candy, XL, X-Energy, Y-Energy) cascade to the #1 Mewtwo first.
 */
export function MewtwoCopiesEditor({ scanSlot }: { scanSlot?: ReactNode }) {
  const xi = usePlannerStore((s) => s.inputs[MEWTWO_X_ID]);
  const yi = usePlannerStore((s) => s.inputs[MEWTWO_Y_ID]);
  const addMewtwoCopy = usePlannerStore((s) => s.addMewtwoCopy);
  const removeMewtwoCopy = usePlannerStore((s) => s.removeMewtwoCopy);
  const updateMewtwoCopy = usePlannerStore((s) => s.updateMewtwoCopy);
  const moveMewtwoCopy = usePlannerStore((s) => s.moveMewtwoCopy);

  const owner = xi?.selected ? xi : yi;
  const copies = owner?.copies ?? [];
  const needs = perMewtwoCopyNeeds(xi, yi);

  return (
    <div className="mt-3 rounded-lg border border-gofest-accent2/25 bg-gofest-accent2/[0.04] p-2.5">
      <div className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-gofest-accent2">
        Maxing {copies.length} Mewtwo · priority order
      </div>
      <p className="mb-2 text-[12px] text-slate-500">
        Shared Candy / XL / X-Energy / Y-Energy (above) fill the #1 Mewtwo first. A caught Mewtwo only has one
        branch unlocked, so setting an X level clears Y (and vice-versa).
      </p>
      {scanSlot ? <div className="mb-2">{scanSlot}</div> : null}
      <div className="space-y-2">
        {copies.map((c, i) => {
          const net = needs[i];
          const parts: string[] = [];
          if (net) {
            if (net.xEnergy > 0) parts.push(`X-En ${formatNumber(net.xEnergy)}`);
            if (net.yEnergy > 0) parts.push(`Y-En ${formatNumber(net.yEnergy)}`);
            if (net.xl > 0) parts.push(`XL ${formatNumber(net.xl)}`);
          }
          // "One branch only" guard: raising a current branch zeroes the other.
          const setXcur = (v: number) => updateMewtwoCopy(c.id, v > 0 ? { megaLevel: v, megaLevelY: 0 } : { megaLevel: v });
          const setYcur = (v: number) => updateMewtwoCopy(c.id, v > 0 ? { megaLevelY: v, megaLevel: 0 } : { megaLevelY: v });
          return (
            <div key={c.id} className="rounded-md border border-white/10 bg-gofest-bg/40 p-2">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="rounded bg-gofest-accent2/20 px-1.5 py-0.5 text-[12px] font-bold text-gofest-accent2">#{i + 1}</span>
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" disabled={i === 0} onClick={() => moveMewtwoCopy(c.id, -1)} className={iconBtn} aria-label="Raise priority">↑</button>
                  <button type="button" disabled={i === copies.length - 1} onClick={() => moveMewtwoCopy(c.id, 1)} className={iconBtn} aria-label="Lower priority">↓</button>
                  <button type="button" disabled={copies.length === 1} onClick={() => removeMewtwoCopy(c.id)} className={`${iconBtn} hover:border-rose-400/50 hover:text-rose-300`} aria-label="Remove Mewtwo">✕</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                <NumberInput label="Level" value={c.current.level} min={1} max={50} step={0.5} onChange={(v) => updateMewtwoCopy(c.id, { level: v })} />
                <NumberInput label="→ Target" value={c.target.level} min={1} max={50} step={0.5} onChange={(v) => updateMewtwoCopy(c.id, { targetLevel: v })} />
                <NumberInput label="X mega" value={c.current.megaLevel} min={0} max={4} onChange={setXcur} />
                <NumberInput label="→ Tgt X" value={c.target.megaLevel} min={0} max={4} onChange={(v) => updateMewtwoCopy(c.id, { targetMegaLevel: v })} />
                <NumberInput label="Y mega" value={c.current.megaLevelY ?? 0} min={0} max={4} onChange={setYcur} />
                <NumberInput label="→ Tgt Y" value={c.target.megaLevelY ?? 4} min={0} max={4} onChange={(v) => updateMewtwoCopy(c.id, { targetMegaLevelY: v })} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {VARIANTS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => updateMewtwoCopy(c.id, { variant: v.id })}
                    aria-pressed={c.variant === v.id}
                    className={`rounded px-2 py-0.5 text-[12px] transition ${
                      c.variant === v.id ? "bg-gofest-accent2 font-semibold text-black" : "border border-white/15 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
                <span className="ml-auto text-[12px] text-slate-400">
                  {parts.length ? <>still needs {parts.join(" · ")}</> : <span className="text-emerald-300">✓ covered by on-hand</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={addMewtwoCopy}
        className="mt-2 w-full rounded-md border border-dashed border-white/20 py-1.5 text-[13px] text-slate-300 transition hover:border-gofest-accent2/50 hover:text-white"
      >
        ＋ Add another Mewtwo
      </button>
    </div>
  );
}
