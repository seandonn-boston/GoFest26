// Engine-true "show your work" layer. For a boss/currency it rebuilds the exact
// steps the engine took — gross requirement → minus what's on hand → ÷ per-raid
// reward → raids — as a list of equation tokens. Some tokens are EDITABLE: they
// point at a source input field (the same one the card edits), so a tooltip can
// let the user change it inline and cascade the recompute. The final `needed`
// and `raids` here equal computeBossResult's, asserted in the tests.

import { GAME_CONFIG } from "@/data/config";
import { clamp } from "@/lib/math";
import { rewardBreakdown, raidsForCurrency } from "./raidsNeeded";
import type { CalibrationMetric } from "./settings";
import type { BossInput, Currency, RaidBoss, Range } from "./types";

/** A source input the user can edit inline (maps to a store setter in the UI). */
export type EditField =
  | "current.level"
  | "current.xlCandy"
  | "current.megaEnergy"
  | "current.candy"
  | "current.megaLevel"
  | "target.level"
  | "target.megaLevel"
  | "quantity";

export type Token =
  | { t: "text"; s: string }
  | { t: "const"; n: number; title?: string }
  | { t: "edit"; field: EditField; n: number; min?: number; max?: number }
  | { t: "out"; s: string };

export interface ExplainLine {
  tokens: Token[];
}

export interface CurrencyExplanation {
  currency: Currency;
  needed: number;
  raids: Range;
  lines: ExplainLine[];
  note?: string;
}

const fmt = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? `${r}` : `${r}`;
};
const rangeStr = (r: Range) => (r.min === r.max ? fmt(r.min) : `${fmt(r.min)}–${fmt(r.max)}`);

const txt = (s: string): Token => ({ t: "text", s });
const cst = (n: number, title?: string): Token => ({ t: "const", n, title });
const ed = (field: EditField, n: number, bounds?: { min?: number; max?: number }): Token => ({
  t: "edit",
  field,
  n,
  ...bounds,
});
const out = (s: string): Token => ({ t: "out", s });

type Calibration = Partial<Record<CalibrationMetric, number>>;

/** The "÷ per-raid reward = raids" tail, with the reward broken into its parts. */
function rewardTail(
  boss: RaidBoss,
  currency: Currency,
  input: BossInput,
  needed: number,
  calibration: Calibration,
  megaBuddyLevel: number,
): { lines: ExplainLine[]; raids: Range } {
  const bd = rewardBreakdown(boss, currency, input, calibration, megaBuddyLevel);
  const reward = bd.range ?? { min: 0, max: 0 };
  const raids = reward.max > 0 ? raidsForCurrency(needed, reward) : { min: 0, max: 0 };
  const lines: ExplainLine[] = [];

  if (bd.calibrated !== undefined) {
    lines.push({ tokens: [txt("per raid ="), out(`${fmt(bd.calibrated)}`), txt("(your logged value)")] });
  } else if (bd.boostFactor !== undefined && bd.boostFactor !== 1 && bd.base) {
    lines.push({
      tokens: [
        txt("per raid ="),
        out(rangeStr(bd.base)),
        txt(`× ${fmt(bd.boostFactor)} buddy boost =`),
        out(rangeStr(reward)),
      ],
    });
  } else if (bd.candyBonus !== undefined && bd.base) {
    lines.push({
      tokens: [txt("per raid ="), out(rangeStr(bd.base)), txt(`+ ${bd.candyBonus} bonus =`), out(rangeStr(reward))],
    });
  } else {
    lines.push({ tokens: [txt("per raid ="), out(rangeStr(reward))] });
  }

  lines.push({
    tokens: [txt(`${fmt(needed)} ÷ ${rangeStr(reward)} per raid = ⌈…⌉`), out(`${rangeStr(raids)} raids`)],
  });
  return { lines, raids };
}

/**
 * Build the step-by-step explanation for one boss currency. Returns null when
 * the currency isn't needed (nothing to explain). Numbers match the engine.
 */
export function explainCurrency(
  boss: RaidBoss,
  input: BossInput,
  currency: Currency,
  calibration: Calibration = {},
  megaBuddyLevel = 1,
): CurrencyExplanation | null {
  const quantity = Math.max(1, Math.round(input.quantity ?? 1));
  const lines: ExplainLine[] = [];
  let note: string | undefined;

  if (currency === "xlCandy") {
    const curLvl = clamp(input.current.level, 40, 50);
    const tgtLvl = clamp(input.target.level, 40, 50);
    const bandFrac = Math.max(0, tgtLvl - curLvl) / 10;
    const xlTo50 = GAME_CONFIG.xlToLevel50[input.variant ?? "standard"];
    const perCopy = Math.round(xlTo50 * bandFrac);
    const gross = perCopy * quantity;
    const held = input.current.xlCandy;
    const needed = Math.max(0, gross - held);
    if (needed <= 0) return null;
    if (curLvl !== input.current.level || tgtLvl !== input.target.level) {
      note = "Levels clamped to the 40–50 XL band (below 40 uses regular Candy).";
    }
    lines.push({
      tokens: [
        cst(xlTo50, `XL to go 40→50 (${input.variant ?? "standard"})`),
        txt("XL ×"),
        out(`${fmt(bandFrac)}`),
        txt("of the band (L"),
        ed("current.level", input.current.level, { min: 1, max: 50 }),
        txt("→ L"),
        ed("target.level", input.target.level, { min: 1, max: 50 }),
        txt(") ="),
        out(`${fmt(perCopy)} XL`),
      ],
    });
    if (quantity > 1) {
      lines.push({
        tokens: [txt("×"), ed("quantity", quantity, { min: 1, max: 99 }), txt("copies ="), out(`${fmt(gross)}`)],
      });
    }
    lines.push({
      tokens: [txt("−"), ed("current.xlCandy", held, { min: 0 }), txt("on hand ="), out(`${fmt(needed)} still needed`)],
    });
    const { lines: tail, raids } = rewardTail(boss, currency, input, needed, calibration, megaBuddyLevel);
    lines.push(...tail);
    return { currency, needed, raids, lines, note };
  }

  if (currency === "megaEnergy") {
    const totals = boss.megaLevelEnergyTotals;
    if (!totals) return null;
    const start = clamp(input.current.megaLevel, 0, totals.length - 1);
    const target = clamp(input.target.megaLevel, 0, totals.length - 1);
    const perCopy = Math.max(0, totals[target] - totals[start]);
    const gross = perCopy * quantity;
    const held = input.current.megaEnergy;
    const needed = Math.max(0, gross - held);
    if (needed <= 0) return null;
    lines.push({
      tokens: [
        txt("Energy for Mega L"),
        ed("current.megaLevel", input.current.megaLevel, { min: 0, max: totals.length - 1 }),
        txt("→ L"),
        ed("target.megaLevel", input.target.megaLevel, { min: 0, max: totals.length - 1 }),
        txt("="),
        cst(totals[target], `cumulative to Mega L${target}`),
        txt("−"),
        cst(totals[start], `cumulative to Mega L${start}`),
        txt("="),
        out(`${fmt(perCopy)}`),
      ],
    });
    if (quantity > 1) {
      lines.push({
        tokens: [txt("×"), ed("quantity", quantity, { min: 1, max: 99 }), txt("copies ="), out(`${fmt(gross)}`)],
      });
    }
    lines.push({
      tokens: [txt("−"), ed("current.megaEnergy", held, { min: 0 }), txt("on hand ="), out(`${fmt(needed)} still needed`)],
    });
    const { lines: tail, raids } = rewardTail(boss, currency, input, needed, calibration, megaBuddyLevel);
    lines.push(...tail);
    return { currency, needed, raids, lines, note };
  }

  // candy (sub-40 leveling) — rarely the binding currency, kept for completeness.
  const candyFrom = clamp(input.current.level, 1, 40);
  const candyTo = clamp(input.target.level, 1, 40);
  const frac = Math.max(0, candyTo - candyFrom) / 39;
  const perCopy = Math.round(GAME_CONFIG.leveling.candyToLevel40 * frac);
  const gross = perCopy * quantity;
  const held = input.current.candy;
  const needed = Math.max(0, gross - held);
  if (needed <= 0) return null;
  lines.push({
    tokens: [
      cst(GAME_CONFIG.leveling.candyToLevel40, "≈ Candy 1→40"),
      txt("Candy × band (L"),
      ed("current.level", input.current.level, { min: 1, max: 50 }),
      txt("→ L"),
      ed("target.level", input.target.level, { min: 1, max: 50 }),
      txt(") ="),
      out(`${fmt(gross)}`),
    ],
  });
  lines.push({
    tokens: [txt("−"), ed("current.candy", held, { min: 0 }), txt("on hand ="), out(`${fmt(needed)} still needed`)],
  });
  const { lines: tail, raids } = rewardTail(boss, currency, input, needed, calibration, megaBuddyLevel);
  lines.push(...tail);
  return { currency, needed, raids, lines, note };
}
