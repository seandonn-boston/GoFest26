import type { RaidBoss } from "./types";

function shareType(a: RaidBoss, b: RaidBoss): boolean {
  const at = a.types ?? [];
  const bt = b.types ?? [];
  return at.some((t) => bt.includes(t));
}

/**
 * Picks which Mega the user should have evolved as their buddy while raiding
 * `target`, to boost Candy/XL gained. The buddy must be a Mega the user is
 * already working on (`candidateMegas`) and must share a type with `target`.
 * Returns the matching mega boss, or null if none applies.
 */
export function recommendBuddy(target: RaidBoss, candidateMegas: RaidBoss[]): RaidBoss | null {
  const matches = candidateMegas.filter((m) => m.id !== target.id && shareType(m, target));
  if (matches.length === 0) return null;
  // Prefer the highest-tier, top-priority mega among the matches.
  matches.sort((a, b) => a.sortPriority - b.sortPriority);
  return matches[0];
}
