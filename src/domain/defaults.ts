import type { BossInput, RaidBoss } from "./types";

function defaultTargetMegaLevel(boss: RaidBoss): number {
  if (boss.tier === "super-mega") return 4;
  if (boss.tier === "mega") return 3;
  return 0;
}

/** Builds a fresh, selected BossInput with sensible defaults for a boss. */
export function makeDefaultInput(boss: RaidBoss): BossInput {
  const isMega = boss.tier === "mega" || boss.tier === "super-mega";
  return {
    bossId: boss.id,
    selected: true,
    variant: "standard",
    current: { candy: 0, xlCandy: 0, megaEnergy: 0, level: 40, megaLevel: 0 },
    // Mega bosses default to "just the mega level" (no leveling) since that's the
    // headline use case; 5★ legendaries default to a full level 40→50 climb.
    target: { level: isMega ? 40 : 50, megaLevel: defaultTargetMegaLevel(boss) },
    skipCatch: false,
    megaBuddy: true,
  };
}
