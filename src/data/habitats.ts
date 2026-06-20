import type { EventDay, HabitatWindow, RaidBoss } from "@/domain/types";
import { GAME_CONFIG } from "./config";
import { hourLabel } from "@/lib/format";

/**
 * The six GO Fest 2026: Global habitat hour-blocks (three per day). Mega and
 * 5★ raid bosses rotate with these blocks. Hours are event-local indexes
 * 0..8 (10am = 0 ... 6pm = 8).
 */
export interface Habitat {
  day: EventDay;
  name: string;
  /** inclusive */
  startHour: number;
  /** exclusive */
  endHour: number;
  /** Featured wild Pokémon types for the block. */
  types: string[];
}

export const HABITATS: Habitat[] = [
  // Saturday, July 11
  { day: "sat", name: "Stormfire Peaks", startHour: 0, endHour: 3, types: ["Ice", "Electric", "Fire"] },
  { day: "sat", name: "Astral Tides", startHour: 3, endHour: 6, types: ["Psychic", "Ghost", "Water"] },
  { day: "sat", name: "Dragonflight Summit", startHour: 6, endHour: 9, types: ["Flying", "Rock", "Dragon"] },
  // Sunday, July 12
  { day: "sun", name: "Earthforged Domain", startHour: 0, endHour: 3, types: ["Ground", "Steel", "Normal"] },
  { day: "sun", name: "Verdant Anomaly", startHour: 3, endHour: 6, types: ["Poison", "Bug", "Grass"] },
  { day: "sun", name: "Twilight Battlefield", startHour: 6, endHour: 9, types: ["Dark", "Fairy", "Fighting"] },
];

/** Finds the habitat covering a given day + hour, if any. */
export function habitatAt(day: EventDay, hour: number): Habitat | undefined {
  return HABITATS.find((h) => h.day === day && hour >= h.startHour && hour < h.endHour);
}

/** Stable key for a habitat block (per-block priority + quick-catch maps). */
export function blockKey(day: EventDay, startHour: number): string {
  return `${day}${startHour}`;
}

/**
 * Which event days a boss is raidable on — both for all-weekend bosses (Mewtwo),
 * otherwise the distinct days of its habitat windows. Used to split the counter
 * and mega search strings into a Saturday list and a Sunday list.
 */
export function bossDays(boss: RaidBoss): EventDay[] {
  if (boss.allWeekend) return ["sat", "sun"];
  const days = new Set<EventDay>();
  for (const w of boss.windows) days.add(w.day);
  return (["sat", "sun"] as EventDay[]).filter((d) => days.has(d));
}
export function wildTypesForBoss(boss: RaidBoss): string[] {
  if (boss.allWeekend) return [];
  const out = new Set<string>();
  for (const wd of boss.windows) {
    const hab = HABITATS.find(
      (h) => h.day === wd.day && h.startHour === wd.startHour && h.endHour === wd.endHour,
    );
    if (hab) for (const t of hab.types) out.add(t);
  }
  return [...out];
}

const DAY_LONG: Record<EventDay, string> = { sat: "Saturday", sun: "Sunday" };
const DAY_SHORT: Record<EventDay, string> = { sat: "Sat", sun: "Sun" };

/** Human label for one availability window, e.g. "Sat 1:00 PM–4:00 PM · Astral Tides". */
export function describeWindow(wd: HabitatWindow): string {
  const start = GAME_CONFIG.event.hourStartLocal;
  if (wd.startHour === 0 && wd.endHour === GAME_CONFIG.event.hoursPerDay) {
    return `${DAY_LONG[wd.day]} · all day`;
  }
  const hab = HABITATS.find(
    (h) => h.day === wd.day && h.startHour === wd.startHour && h.endHour === wd.endHour,
  );
  const span = `${DAY_SHORT[wd.day]} ${hourLabel(wd.startHour, start)}–${hourLabel(wd.endHour, start)}`;
  return hab ? `${span} · ${hab.name}` : span;
}

/** Full availability description across all of a boss's windows. */
export function describeAvailability(boss: RaidBoss): string {
  if (!boss.windows.length) return "All weekend";
  return boss.windows.map(describeWindow).join("  •  ");
}

/**
 * Max raids obtainable for a boss within its windows at a given raids/hour.
 * NOTE: this assumes the boss is up for the whole habitat block. Per the GO Fest
 * 2026 Global announcement, "Mega and 5★ Raid Bosses rotate hourly following the
 * habitat schedule", so a specific boss may only appear part of its 3-hour block —
 * treat this as a generous upper bound (the over-window warning says as much).
 */
export function bossWindowSlots(boss: RaidBoss, raidsPerHour: number): number {
  return boss.windows.reduce((sum, wd) => sum + (wd.endHour - wd.startHour) * raidsPerHour, 0);
}
