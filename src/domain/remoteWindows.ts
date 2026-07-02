// Remote-raid scheduling — WHEN (in the player's own clock) a region-locked
// target is actually raidable somewhere in its home region.
//
// Every GO Fest window runs on the HOST region's local time: Japan's Sunday
// 1–4 PM habitat block happens during a Boston Saturday night. So for each
// remote target we translate each of its windows out of "region local time"
// into absolute UTC instants:
//   • a WIDE span — from the window opening in the region's easternmost
//     timezone to it closing in the westernmost ("it's up somewhere"), and
//   • the ANCHOR window — a representative dense-population city (Tokyo for
//     Asia-Pacific, …) for one concrete recommendation.
// The UI formats these instants with the device's own timezone, so no user
// offset ever enters the math here.

import { GAME_CONFIG } from "@/data/config";
import { ROAD_DAYS } from "@/data/roadOfLegends";
import { EVENT_CALENDAR, regionClockFor, type RegionClock } from "@/data/regionClocks";
import { HABITATS } from "@/data/habitats";
import type { RaidBoss } from "./types";

export interface RemoteWindow {
  /** What's happening in the host region, e.g. "Sun 1–4 PM · Verdant Anomaly". */
  hostLabel: string;
  /** Wide span: the window is open SOMEWHERE in the region between these. */
  startUtc: number;
  endUtc: number;
  /** The anchor city's concrete window. */
  anchorStartUtc: number;
  anchorEndUtc: number;
  anchorCity: string;
  /** Host-region label ("Asia-Pacific"). */
  regionLabel: string;
}

/** UTC ms for `clockMin` minutes past midnight (region-local) on an event day,
 *  seen from a zone `offsetMin` east of UTC. */
function utcAt(dayId: string, clockMin: number, offsetMin: number): number {
  const dom = EVENT_CALENDAR.dayOfMonth[dayId];
  return Date.UTC(EVENT_CALENDAR.year, EVENT_CALENDAR.monthIndex, dom, 0, clockMin - offsetMin);
}

/** Format a region-local clock hour like "1 PM" (whole hours only in our data). */
function hostClock(hour24: number): string {
  const h = ((hour24 + 11) % 12) + 1;
  return `${h} ${hour24 < 12 ? "AM" : "PM"}`;
}

function makeWindow(
  clock: RegionClock,
  dayId: string,
  dayShort: string,
  startHour24: number,
  endHour24: number,
  what: string,
): RemoteWindow {
  const startMin = startHour24 * 60;
  const endMin = endHour24 * 60;
  return {
    hostLabel: `${dayShort} ${hostClock(startHour24)}–${hostClock(endHour24)} · ${what}`,
    // Easternmost zone reaches the window first; westernmost leaves it last.
    startUtc: utcAt(dayId, startMin, clock.eastOffsetMin),
    endUtc: utcAt(dayId, endMin, clock.westOffsetMin),
    anchorStartUtc: utcAt(dayId, startMin, clock.anchor.offsetMin),
    anchorEndUtc: utcAt(dayId, endMin, clock.anchor.offsetMin),
    anchorCity: clock.anchor.city,
    regionLabel: clock.label,
  };
}

const DAY_SHORT: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/**
 * The host-region windows in which a region-locked boss can be remote-raided:
 * its weekend habitat block(s), plus any Road of Legends raid hour featuring it
 * (region-locked 5★ are all in Monday's marathon roster). Chronological by the
 * anchor window. Returns null for a boss that isn't region-locked — its windows
 * are simply the listed local ones.
 */
export function remoteWindowsForBoss(boss: RaidBoss): RemoteWindow[] | null {
  const clock = regionClockFor(boss.region);
  if (!clock) return null;
  const start = GAME_CONFIG.event.hourStartLocal; // habitat hours are event-local indexes
  const out: RemoteWindow[] = [];

  // Road of Legends raid hours featuring this boss (host-region 6–8 PM window;
  // 5★ raid the 6–7 PM hour except Monday's 2-hour marathon).
  for (const day of ROAD_DAYS) {
    if (!day.bossIds.includes(boss.id)) continue;
    const isMega = boss.tier === "mega" || boss.tier === "super-mega";
    const fiveStarEnd = 18 + (day.raidHourHours - day.megaHours);
    const [s, e] = isMega ? [20 - day.megaHours, 20] : [18, fiveStarEnd];
    out.push(makeWindow(clock, day.id, DAY_SHORT[day.id], s, e, `Raid Hour (${day.dateLabel})`));
  }

  // Weekend habitat blocks.
  for (const w of boss.windows) {
    const habitat = HABITATS.find((h) => h.day === w.day && w.startHour < h.endHour && w.endHour > h.startHour);
    out.push(
      makeWindow(clock, w.day, DAY_SHORT[w.day], start + w.startHour, start + w.endHour, habitat?.name ?? "habitat block"),
    );
  }

  return out.sort((a, b) => a.anchorStartUtc - b.anchorStartUtc);
}
