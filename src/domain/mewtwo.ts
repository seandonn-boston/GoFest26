// Mewtwo's resource model is unique: X and Y are separate raids (X Saturday, Y
// Sunday) with SEPARATE Mega Energy, but one underlying Mewtwo whose 40→50
// leveling (XL + Candy) is farmed from either day. A single individual therefore
// carries a Pokémon level, an X mega level and an INDEPENDENT Y mega level
// (a caught Mewtwo only ever has one branch pre-unlocked). This module computes
// both forms' results together so the shared leveling is counted exactly once
// and split across the two days — generalizing the old single-copy split to the
// multi-copy (several distinct Mewtwo) case.

import { getBoss, MEWTWO_X_ID, MEWTWO_Y_ID } from "@/data";
import { GAME_CONFIG } from "@/data/config";
import { clamp, midpoint } from "@/lib/math";
import { bossResultFromNeeds } from "./raidsNeeded";
import type { BossInput, BossResult, Currency, PokemonCopy, RaidBoss, Variant } from "./types";
import type { CalibrationMetric } from "./settings";

type Calibration = Partial<Record<CalibrationMetric, number>>;

const energyNeed = (totals: number[] | undefined, from: number, to: number): number => {
  if (!totals) return 0;
  return Math.max(0, totals[clamp(to, 0, totals.length - 1)] - totals[clamp(from, 0, totals.length - 1)]);
};
const xlNeed = (variant: Variant, from: number, to: number): number =>
  Math.round((GAME_CONFIG.xlToLevel50[variant] * Math.max(0, clamp(to, 40, 50) - clamp(from, 40, 50))) / 10);
const candyNeed = (from: number, to: number): number =>
  Math.round((GAME_CONFIG.leveling.candyToLevel40 * Math.max(0, clamp(to, 1, 40) - clamp(from, 1, 40))) / 39);

interface MewtwoIndividual {
  variant: Variant;
  level: number;
  tLevel: number;
  xCur: number;
  xTgt: number;
  yCur: number;
  yTgt: number;
}

/** The Mewtwo individuals to plan for: the owner's explicit copies (each with
 *  independent X/Y mega levels) or a single fallback from the X & Y inputs. */
function mewtwoIndividuals(xi: BossInput | undefined, yi: BossInput | undefined): MewtwoIndividual[] {
  const owner = (xi?.selected ? xi : yi)!;
  if (owner.copies?.length) {
    return owner.copies.map((c: PokemonCopy) => ({
      variant: c.variant,
      level: c.current.level,
      tLevel: c.target.level,
      xCur: c.current.megaLevel,
      xTgt: c.target.megaLevel,
      yCur: c.current.megaLevelY ?? 0,
      yTgt: c.target.megaLevelY ?? c.target.megaLevel,
    }));
  }
  // Single fallback (× quantity): X mega from the X input, Y mega from the Y
  // input, level/variant from whichever form owns the shared leveling.
  const qty = Math.max(1, Math.round(owner.quantity ?? 1));
  const one: MewtwoIndividual = {
    variant: owner.variant ?? "standard",
    level: owner.current.level,
    tLevel: owner.target.level,
    xCur: xi?.current.megaLevel ?? 0,
    xTgt: xi?.target.megaLevel ?? 0,
    yCur: yi?.current.megaLevel ?? 0,
    yTgt: yi?.target.megaLevel ?? 0,
  };
  return Array.from({ length: qty }, () => ({ ...one }));
}

/** X's share (0..1) of the shared leveling — weighted so each form's TOTAL raids
 *  (its own day-locked energy + its leveling share) come out as even as possible. */
function levelingFracX(levelXl: number, satEnergy: number, sunEnergy: number, bossX: RaidBoss): number {
  const enMid = bossX.rewards.megaEnergy ? midpoint(bossX.rewards.megaEnergy) : 0;
  const xlMid = bossX.rewards.xlCandy ? midpoint(bossX.rewards.xlCandy) : 0;
  const ex = enMid > 0 ? satEnergy / enMid : 0;
  const ey = enMid > 0 ? sunEnergy / enMid : 0;
  const lr = xlMid > 0 ? levelXl / xlMid : 0;
  if (lr <= 0) return 0.5;
  const total = Math.max(ex + ey, lr);
  const rx = clamp(total / 2, ex, total - ey);
  return total > 0 ? rx / total : 0.5;
}

const needsFor = (energy: number, xl: number, candy: number): Partial<Record<Currency, number>> => {
  const o: Partial<Record<Currency, number>> = {};
  if (energy > 0) o.megaEnergy = energy;
  if (xl > 0) o.xlCandy = xl;
  if (candy > 0) o.candy = candy;
  return o;
};

/**
 * Results for the selected Mewtwo form(s). Per-form Mega Energy comes from each
 * individual's own X / Y branch; the shared leveling (XL + Candy) is counted once
 * and split across both days when both forms are raided. Replaces the generic
 * per-boss computeBossResult for Mewtwo so XL is never double-counted.
 */
export function computeMewtwoResults(
  inputs: BossInput[],
  calibration: Calibration = {},
  megaBuddyLevel = 1,
): BossResult[] {
  const xi = inputs.find((i) => i.bossId === MEWTWO_X_ID && i.selected);
  const yi = inputs.find((i) => i.bossId === MEWTWO_Y_ID && i.selected);
  if (!xi && !yi) return [];
  const bossX = getBoss(MEWTWO_X_ID)!;
  const bossY = getBoss(MEWTWO_Y_ID)!;
  const owner = (xi?.selected ? xi : yi)!;

  let xEnergy = 0;
  let yEnergy = 0;
  let xl = 0;
  let candy = 0;
  for (const ind of mewtwoIndividuals(xi, yi)) {
    xEnergy += energyNeed(bossX.megaLevelEnergyTotals, ind.xCur, ind.xTgt);
    yEnergy += energyNeed(bossY.megaLevelEnergyTotals, ind.yCur, ind.yTgt);
    xl += xlNeed(ind.variant, ind.level, ind.tLevel);
    candy += candyNeed(ind.level, ind.tLevel);
  }

  // Shared on-hand pools: XL/Candy on the owner, each form's Energy on its input.
  const netXl = Math.max(0, xl - owner.current.xlCandy);
  const netCandy = Math.max(0, candy - owner.current.candy);
  const satEnergy = Math.max(0, xEnergy - (xi?.current.megaEnergy ?? 0));
  const sunEnergy = Math.max(0, yEnergy - (yi?.current.megaEnergy ?? 0));

  const out: BossResult[] = [];
  if (xi && yi) {
    const frac = levelingFracX(netXl, satEnergy, sunEnergy, bossX);
    const splitN = (n: number): [number, number] => {
      const x = Math.round(n * frac);
      return [x, n - x];
    };
    const [xlX, xlY] = splitN(netXl);
    const [candyX, candyY] = splitN(netCandy);
    out.push(bossResultFromNeeds(bossX, xi, needsFor(satEnergy, xlX, candyX), calibration, megaBuddyLevel));
    out.push(bossResultFromNeeds(bossY, yi, needsFor(sunEnergy, xlY, candyY), calibration, megaBuddyLevel));
  } else if (xi) {
    out.push(bossResultFromNeeds(bossX, xi, needsFor(satEnergy, netXl, netCandy), calibration, megaBuddyLevel));
  } else if (yi) {
    out.push(bossResultFromNeeds(bossY, yi, needsFor(sunEnergy, netXl, netCandy), calibration, megaBuddyLevel));
  }
  return out;
}
