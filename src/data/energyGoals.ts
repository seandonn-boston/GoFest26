import type { EnergyGoalDef } from "@/domain/types";

/**
 * Fusion / Crowned / Primal energy goals, by base-form boss id. Each base boss
 * (already a weekend roster target) can be built into a special forme by banking
 * energy from that forme's raid during Road of Legends week (Jul 6–10).
 *
 * Numbers (per public Pokémon GO data, most recently the Jan 2026 Kyurem and the
 * Necrozma Fusion Raid Days):
 *  - Fusing/crowning costs 1,000 energy; the first Primal reversion costs 400
 *    (then 80 to revert that same Pokémon again later).
 *  - A raid awards more energy the faster you win and the more damage you deal,
 *    so per-raid energy is a range, not a flat number. Fusion/Crowned raids give
 *    ~80 (slow) to ~140 (fast) per raid; Primal raids ~80–100.
 *
 * The fused/special raids only run on specific Road of Legends days (e.g. White
 * Kyurem on Tuesday, Black Kyurem on Wednesday), which is why a single energy is
 * earnable on a single day.
 */
const FUSION_PER_RAID = { min: 80, max: 140 } as const;
const PRIMAL_PER_RAID = { min: 80, max: 100 } as const;
const PRIMAL_NOTE = "400 energy reverts it the first time; 80 each time after.";

export const ENERGY_GOALS: Record<string, EnergyGoalDef[]> = {
  kyurem: [
    { key: "blaze", kind: "fusion", label: "Blaze · White Kyurem", flavor: "blaze", cost: 1000, perRaid: FUSION_PER_RAID, source: "White Kyurem", roadDayId: "tue" },
    { key: "volt", kind: "fusion", label: "Volt · Black Kyurem", flavor: "volt", cost: 1000, perRaid: FUSION_PER_RAID, source: "Black Kyurem", roadDayId: "wed" },
  ],
  necrozma: [
    { key: "lunar", kind: "fusion", label: "Lunar · Dawn Wings", flavor: "lunar", cost: 1000, perRaid: FUSION_PER_RAID, source: "Dawn Wings Necrozma", roadDayId: "tue" },
    { key: "solar", kind: "fusion", label: "Solar · Dusk Mane", flavor: "solar", cost: 1000, perRaid: FUSION_PER_RAID, source: "Dusk Mane Necrozma", roadDayId: "wed" },
  ],
  zacian: [
    { key: "sword", kind: "crowned", label: "Crowned Sword", flavor: "sword", cost: 1000, perRaid: FUSION_PER_RAID, source: "Crowned Sword Zacian", roadDayId: "thu" },
  ],
  zamazenta: [
    { key: "shield", kind: "crowned", label: "Crowned Shield", flavor: "shield", cost: 1000, perRaid: FUSION_PER_RAID, source: "Crowned Shield Zamazenta", roadDayId: "thu" },
  ],
  groudon: [
    { key: "primal", kind: "primal", label: "Primal Energy", flavor: "primal", cost: 400, perRaid: PRIMAL_PER_RAID, source: "Primal Groudon", roadDayId: "fri", note: PRIMAL_NOTE },
  ],
  kyogre: [
    { key: "primal", kind: "primal", label: "Primal Energy", flavor: "primal", cost: 400, perRaid: PRIMAL_PER_RAID, source: "Primal Kyogre", roadDayId: "fri", note: PRIMAL_NOTE },
  ],
};

/** Energy goals available for a boss (empty for most). */
export function energyGoalsFor(bossId: string): EnergyGoalDef[] {
  return ENERGY_GOALS[bossId] ?? [];
}

/** Energy goals whose source raid is featured on a given Road of Legends day. */
export function energyGoalsForDay(roadDayId: string): { bossId: string; def: EnergyGoalDef }[] {
  const out: { bossId: string; def: EnergyGoalDef }[] = [];
  for (const [bossId, defs] of Object.entries(ENERGY_GOALS)) {
    for (const def of defs) if (def.roadDayId === roadDayId) out.push({ bossId, def });
  }
  return out;
}

/** Road of Legends day ids that feature at least one fusion/crowned/primal raid. */
export const ENERGY_ROAD_DAYS = new Set(
  Object.values(ENERGY_GOALS).flatMap((defs) => defs.map((d) => d.roadDayId).filter(Boolean)),
);

/** True if any roster boss offers fusion/crowned/primal energy goals. */
export const HAS_ENERGY_GOALS = Object.keys(ENERGY_GOALS).length > 0;
