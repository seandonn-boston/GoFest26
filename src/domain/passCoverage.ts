import type { Range } from "./types";

export interface SpeciesPassNeed {
  bossId: string;
  bossName: string;
  /** Raids this target needs (the binding-currency range). */
  raids: Range;
}

export interface SpeciesPassCoverage extends SpeciesPassNeed {
  /** Raids covered by owned passes (allocated against the worst case). */
  covered: number;
  /** Raids still needing a bought pass, as a range. */
  toBuy: Range;
}

export interface PassCoverage {
  owned: number;
  /** Total raids needed across all targets (range). */
  needed: Range;
  /** Of `owned`, how many land on real demand (range, capped at needed). */
  covered: Range;
  /** Passes still to buy (range). */
  toBuy: Range;
  /** Owned passes beyond the worst-case demand. */
  surplus: number;
  /** Per-target, in priority order — owned passes flow to the top first. */
  perSpecies: SpeciesPassCoverage[];
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * Allocate the user's owned raid passes across their targets in PRIORITY order
 * (the list is assumed already sorted highest-first), so the most important
 * goals are covered first and only the remainder needs buying. Passes are
 * allocated against each target's worst case, so "covered" is a guarantee.
 */
export function computePassCoverage(ordered: SpeciesPassNeed[], owned: number): PassCoverage {
  let pool = Math.max(0, Math.round(owned));
  const perSpecies: SpeciesPassCoverage[] = ordered.map((s) => {
    const covered = Math.min(pool, s.raids.max);
    pool -= covered;
    return {
      ...s,
      covered,
      toBuy: { min: Math.max(0, s.raids.min - covered), max: Math.max(0, s.raids.max - covered) },
    };
  });

  const needed: Range = {
    min: sum(ordered.map((s) => s.raids.min)),
    max: sum(ordered.map((s) => s.raids.max)),
  };
  const ownedClamped = Math.max(0, Math.round(owned));
  return {
    owned: ownedClamped,
    needed,
    covered: { min: Math.min(ownedClamped, needed.min), max: Math.min(ownedClamped, needed.max) },
    toBuy: { min: Math.max(0, needed.min - ownedClamped), max: Math.max(0, needed.max - ownedClamped) },
    surplus: Math.max(0, ownedClamped - needed.max),
    perSpecies,
  };
}
