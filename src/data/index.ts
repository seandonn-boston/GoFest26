import type { RaidBoss } from "@/domain/types";
import { RAID_BOSSES } from "./bosses";
import { GAME_CONFIG } from "./config";

export { GAME_CONFIG } from "./config";
export { RAID_BOSSES } from "./bosses";
export { PRESETS } from "./presets";
export type { Preset } from "./presets";
export { HABITATS, habitatAt, describeWindow, describeAvailability, bossWindowSlots } from "./habitats";
export type { Habitat } from "./habitats";
export { MEWTWO_X_SPRITE, MEWTWO_Y_SPRITE } from "./bosses";
export { LOCATION_PRESETS, DEFAULT_REGION } from "./locations";

/** Roster sorted for display (Mega Mewtwo X/Y pinned to the top). */
export const SORTED_BOSSES: RaidBoss[] = [...RAID_BOSSES].sort((a, b) => a.sortPriority - b.sortPriority);

export function getBoss(id: string): RaidBoss | undefined {
  return RAID_BOSSES.find((b) => b.id === id);
}

// Mega Mewtwo X and Y are separate raids (different days, separate energy) but
// share one underlying Mewtwo, so the UI presents them as a single combined card.
export const MEWTWO_X_ID = "mega-mewtwo-x";
export const MEWTWO_Y_ID = "mega-mewtwo-y";
export const isMewtwo = (id: string): boolean => id === MEWTWO_X_ID || id === MEWTWO_Y_ID;

/**
 * Dev-only sanity checks on the hand-authored game data. Throws in development
 * if the roster is internally inconsistent so mistakes surface immediately.
 */
export function validateData(): void {
  if (process.env.NODE_ENV === "production") return;
  const ids = new Set<string>();
  for (const b of RAID_BOSSES) {
    if (ids.has(b.id)) throw new Error(`Duplicate boss id: ${b.id}`);
    ids.add(b.id);

    for (const c of [b.rewards.candy, b.rewards.xlCandy, b.rewards.megaEnergy]) {
      if (c && c.min > c.max) throw new Error(`${b.id}: reward min > max`);
    }
    if (b.rewardsCurrencies.includes("megaEnergy") && !b.rewards.megaEnergy) {
      throw new Error(`${b.id}: declares megaEnergy currency but has no megaEnergy reward`);
    }
    // A reward min of 0 would make a raids-needed count divide by zero (=> Infinity),
    // so every advertised currency must have a positive minimum reward.
    const rewardByCurrency = {
      candy: b.rewards.candy,
      xlCandy: b.rewards.xlCandy,
      megaEnergy: b.rewards.megaEnergy,
    };
    for (const c of b.rewardsCurrencies) {
      const r = rewardByCurrency[c];
      if (!r || r.min <= 0) throw new Error(`${b.id}: reward for ${c} must have min > 0`);
    }
    if (!b.allWeekend) {
      for (const w of b.windows) {
        if (w.startHour < 0 || w.endHour > GAME_CONFIG.event.hoursPerDay || w.startHour >= w.endHour) {
          throw new Error(`${b.id}: invalid habitat window ${JSON.stringify(w)}`);
        }
      }
    }
    if (b.megaLevelEnergyTotals) {
      const t = b.megaLevelEnergyTotals;
      for (let i = 1; i < t.length; i++) {
        if (t[i] < t[i - 1]) throw new Error(`${b.id}: megaLevelEnergyTotals not monotonic`);
      }
    }
  }
}

// Surface data-authoring mistakes immediately in development.
validateData();
