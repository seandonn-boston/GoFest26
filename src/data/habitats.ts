import type { EventDay } from "@/domain/types";

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
