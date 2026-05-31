import { GAME_CONFIG } from "@/data/config";
import type { Currency, RaidBoss } from "./types";

/**
 * Mega-buddy boost multipliers applied to per-raid rewards.
 *
 * In Pokémon GO, raiding with a Mega-Evolved buddy of a matching type boosts
 * Candy (and, at higher mega levels, XL Candy) earned from the raid. Mega
 * Energy is never boosted. We expose a single multiplier per currency so the
 * engine can model a "with boost" scenario.
 */
export function buddyMultiplier(currency: Currency): number {
  const { candyMultiplier, xlMultiplier, appliesToMegaEnergy } = GAME_CONFIG.buddyBoost;
  switch (currency) {
    case "candy":
      return candyMultiplier;
    case "xlCandy":
      return xlMultiplier;
    case "megaEnergy":
      return appliesToMegaEnergy ? candyMultiplier : 1;
  }
}

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
export function recommendBuddy(
  target: RaidBoss,
  candidateMegas: RaidBoss[],
): RaidBoss | null {
  const matches = candidateMegas.filter(
    (m) => m.id !== target.id && shareType(m, target),
  );
  if (matches.length === 0) return null;
  // Prefer the highest-tier, top-priority mega among the matches.
  matches.sort((a, b) => a.sortPriority - b.sortPriority);
  return matches[0];
}
