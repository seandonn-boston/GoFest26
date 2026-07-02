import type { RegionScope } from "@/domain/types";

/**
 * Host-region clocks for remote-raid scheduling. Every GO Fest window runs on
 * the HOST region's local time, so a remote raider needs each region-locked
 * target's windows translated to their own clock. A region scope spans many
 * timezones, so each scope carries:
 *  - the westernmost/easternmost UTC offsets (July 2026, northern DST active),
 *    giving the widest "it's up SOMEWHERE in the region" span, and
 *  - a representative anchor city — a dense raiding population mid-region —
 *    for a single concrete recommendation.
 * Offsets are in MINUTES east of UTC (half-hour zones exist: India +5:30,
 * Newfoundland −2:30 DST).
 */
export interface RegionClock {
  /** Human label, matches regionScopeLabel phrasing. */
  label: string;
  /** Westernmost UTC offset in the scope (minutes). */
  westOffsetMin: number;
  /** Easternmost UTC offset in the scope (minutes). */
  eastOffsetMin: number;
  anchor: { city: string; offsetMin: number };
}

const H = 60;

// source: standard July UTC offsets — Hawaii −10, Newfoundland −2:30 (NDT),
// Iceland +0, India +5:30, Pakistan +5, New Zealand +12 (NZST), Tokyo +9 (no
// DST), Berlin +2 (CEST), New York −4 (EDT), Sydney +10 (AEST), Santiago −4.
const CLOCKS = {
  americas: {
    label: "Americas & Greenland",
    westOffsetMin: -10 * H,
    eastOffsetMin: -2.5 * H,
    anchor: { city: "New York", offsetMin: -4 * H },
  },
  emea: {
    label: "Europe, Middle East, Africa, India",
    westOffsetMin: 0,
    eastOffsetMin: 5.5 * H,
    anchor: { city: "Berlin", offsetMin: 2 * H },
  },
  apac: {
    label: "Asia-Pacific",
    westOffsetMin: 5 * H,
    eastOffsetMin: 12 * H,
    anchor: { city: "Tokyo", offsetMin: 9 * H },
  },
  // Hemisphere locks span nearly every longitude; the anchor picks a dense
  // raiding population inside the hemisphere.
  N: {
    label: "Northern Hemisphere",
    westOffsetMin: -10 * H,
    eastOffsetMin: 12 * H,
    anchor: { city: "Berlin", offsetMin: 2 * H },
  },
  S: {
    label: "Southern Hemisphere",
    westOffsetMin: -4 * H,
    eastOffsetMin: 12 * H,
    anchor: { city: "Sydney", offsetMin: 10 * H },
  },
  E: { label: "Eastern Hemisphere", westOffsetMin: 0, eastOffsetMin: 12 * H, anchor: { city: "Tokyo", offsetMin: 9 * H } },
  W: {
    label: "Western Hemisphere",
    westOffsetMin: -10 * H,
    eastOffsetMin: 0,
    anchor: { city: "New York", offsetMin: -4 * H },
  },
} satisfies Record<string, RegionClock>;

/** The clock for a region scope, or null when the boss isn't region-locked.
 *  Continent wins over hemisphere axes (a scope specifies one in practice). */
export function regionClockFor(scope: RegionScope | undefined): RegionClock | null {
  if (!scope) return null;
  if (scope.continent) return CLOCKS[scope.continent] ?? null;
  if (scope.ns) return CLOCKS[scope.ns] ?? null;
  if (scope.ew) return CLOCKS[scope.ew] ?? null;
  return null;
}

/** Event calendar (month index is 0-based: 6 = July).
 *  source: confirmed — Road of Legends Mon Jul 6 → Fri Jul 10; GO Fest weekend
 *  Sat Jul 11 + Sun Jul 12, 2026. */
export const EVENT_CALENDAR = {
  year: 2026,
  monthIndex: 6,
  dayOfMonth: { mon: 6, tue: 7, wed: 8, thu: 9, fri: 10, sat: 11, sun: 12 } as Record<string, number>,
};
