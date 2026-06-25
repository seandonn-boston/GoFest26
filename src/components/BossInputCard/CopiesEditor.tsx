"use client";

import type { ReactNode } from "react";
import { usePlannerStore } from "@/store/usePlannerStore";
import { perCopyNeeds } from "@/domain";
import { GAME_CONFIG } from "@/data/config";
import type { BossInput, RaidBoss, Variant } from "@/domain/types";
import { NumberInput } from "@/components/ui/NumberInput";
import { formatNumber } from "@/lib/format";

// Fully maxing all three Max Moves (Max Attack from Lv1 + Max Guard & Max Spirit
// from locked) in Candy / XL — the constant the Dynamax toggle adds per copy.
const MM = GAME_CONFIG.maxMoves;
const MAX_MOVE_CANDY = MM.attackToMax.candy + 2 * MM.lockedMoveToMax.candy;
const MAX_MOVE_XL = MM.attackToMax.xlCandy + 2 * MM.lockedMoveToMax.xlCandy;

const VARIANTS: { id: Variant; label: string }[] = [
  { id: "standard", label: "Reg" },
  { id: "shadow", label: "Shadow" },
  { id: "purified", label: "Purified" },
];
const CUR_LABEL: Record<string, string> = { xlCandy: "XL", megaEnergy: "Energy", candy: "Candy" };

const iconBtn =
  "flex h-5 w-5 items-center justify-center rounded border border-white/15 text-[11px] text-slate-300 transition hover:border-gofest-accent2/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-30";

/**
 * Editor for maxing several distinct individuals of one species. Each row is one
 * individual (its own level / mega level / variant / target); the list is the
 * priority order. The shared on-hand pool (entered above) cascades to the #1
 * individual first — `perCopyNeeds` reports each one's remaining need.
 */
export function CopiesEditor({ boss, input, scanSlot }: { boss: RaidBoss; input: BossInput; scanSlot?: ReactNode }) {
  const addCopy = usePlannerStore((s) => s.addCopy);
  const removeCopy = usePlannerStore((s) => s.removeCopy);
  const updateCopy = usePlannerStore((s) => s.updateCopy);
  const moveCopy = usePlannerStore((s) => s.moveCopy);

  const isMega = boss.tier === "mega" || boss.tier === "super-mega";
  const needs = perCopyNeeds(boss, input);
  const copies = input.copies ?? [];

  return (
    <div className="mt-3 rounded-lg border border-gofest-accent2/25 bg-gofest-accent2/[0.04] p-2.5">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gofest-accent2">
        Maxing {copies.length} {copies.length === 1 ? "individual" : "individuals"} · priority order
      </div>
      <p className="mb-2 text-[10px] text-slate-500">
        Your on-hand XL / Candy / Energy above is one shared pool — it fills the #1 individual first, then the next.
      </p>
      {scanSlot ? <div className="mb-2">{scanSlot}</div> : null}
      <div className="space-y-2">
        {copies.map((c, i) => {
          const net = needs[i]?.net ?? {};
          const netEntries = (Object.entries(net) as [string, number][]).filter(([, v]) => (v ?? 0) > 0);
          return (
            <div key={c.id} className="rounded-md border border-white/10 bg-gofest-bg/40 p-2">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="rounded bg-gofest-accent2/20 px-1.5 py-0.5 text-[10px] font-bold text-gofest-accent2">
                  #{i + 1}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <button type="button" disabled={i === 0} onClick={() => moveCopy(boss.id, c.id, -1)} className={iconBtn} aria-label="Raise priority">
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === copies.length - 1}
                    onClick={() => moveCopy(boss.id, c.id, 1)}
                    className={iconBtn}
                    aria-label="Lower priority"
                  >
                    ↓
                  </button>
                  <button type="button" disabled={copies.length === 1} onClick={() => removeCopy(boss.id, c.id)} className={`${iconBtn} hover:border-rose-400/50 hover:text-rose-300`} aria-label="Remove individual">
                    ✕
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <NumberInput label="Level" value={c.current.level} min={1} max={50} step={0.5} onChange={(v) => updateCopy(boss.id, c.id, { level: v })} />
                <NumberInput label="→ Target" value={c.target.level} min={1} max={50} step={0.5} onChange={(v) => updateCopy(boss.id, c.id, { targetLevel: v })} />
                {isMega ? (
                  <>
                    <NumberInput label="Mega lvl" value={c.current.megaLevel} min={0} max={4} onChange={(v) => updateCopy(boss.id, c.id, { megaLevel: v })} />
                    <NumberInput label="→ Tgt mega" value={c.target.megaLevel} min={0} max={4} onChange={(v) => updateCopy(boss.id, c.id, { targetMegaLevel: v })} />
                  </>
                ) : null}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {VARIANTS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => updateCopy(boss.id, c.id, { variant: v.id })}
                    aria-pressed={c.variant === v.id}
                    className={`rounded px-2 py-0.5 text-[10px] transition ${
                      c.variant === v.id ? "bg-gofest-accent2 font-semibold text-black" : "border border-white/15 text-slate-300 hover:border-white/30"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
                <span className="ml-auto text-[10px] text-slate-400">
                  {netEntries.length ? (
                    <>still needs {netEntries.map(([k, v]) => `${CUR_LABEL[k] ?? k} ${formatNumber(v)}`).join(" · ")}</>
                  ) : (
                    <span className="text-emerald-300">✓ covered by on-hand</span>
                  )}
                </span>
              </div>
              <label className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-300">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-gofest-accent2"
                  checked={c.maxMoves ?? false}
                  onChange={(e) => updateCopy(boss.id, c.id, { maxMoves: e.target.checked })}
                />
                <span>
                  Max its Dynamax moves{" "}
                  <span className="text-slate-500">
                    (+{formatNumber(MAX_MOVE_CANDY)} Candy · +{formatNumber(MAX_MOVE_XL)} XL)
                  </span>
                </span>
              </label>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => addCopy(boss.id)}
        className="mt-2 w-full rounded-md border border-dashed border-white/20 py-1.5 text-[11px] text-slate-300 transition hover:border-gofest-accent2/50 hover:text-white"
      >
        ＋ Add another individual
      </button>
    </div>
  );
}
