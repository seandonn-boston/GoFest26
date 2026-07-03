import type { BossInput, RaidBoss } from "./types";

function defaultTargetMegaLevel(boss: RaidBoss): number {
  if (boss.tier === "super-mega") return 4;
  if (boss.tier === "mega") return 3;
  return 0;
}

/** Builds a fresh, selected BossInput with sensible defaults for a boss. */
export function makeDefaultInput(boss: RaidBoss): BossInput {
  // Mewtwo X/Y default to Mega Level 1 (GO Fest-caught Mewtwo start pre-unlocked,
  // skipping the 7,500 first-evolution cost). Owners of a Level-0 Mewtwo can edit.
  const startMegaLevel = boss.goFestPreUnlocked ? 1 : 0;
  return {
    bossId: boss.id,
    selected: true,
    counts: { standard: 1, shadow: 0, purified: 0 },
    quantity: 1,
    // Raid catches are Level 20, or Level 25 when weather-boosted; assume 25 as the
    // starting level (the 20→25 candy is negligible and easily on hand).
    current: { candy: 0, xlCandy: 0, megaEnergy: 0, level: 25, megaLevel: startMegaLevel },
    // Every target defaults to a full Level 50 climb (megas included, for
    // consistency across the app), plus the tier's default mega level.
    target: { level: 50, megaLevel: defaultTargetMegaLevel(boss) },
    megaBuddy: true,
  };
}
