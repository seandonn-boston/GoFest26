import type { Range } from "@/domain/types";

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Integer ceiling division; returns 0 when the numerator is <= 0. */
export function ceilDiv(numerator: number, denominator: number): number {
  if (numerator <= 0) return 0;
  if (denominator <= 0) return Infinity;
  return Math.ceil(numerator / denominator);
}

export function midpoint(r: Range): number {
  return (r.min + r.max) / 2;
}

export function addRange(a: Range, b: Range): Range {
  return { min: a.min + b.min, max: a.max + b.max };
}

export const ZERO_RANGE: Range = { min: 0, max: 0 };
