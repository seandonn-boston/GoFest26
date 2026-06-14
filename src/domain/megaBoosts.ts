// Mega candy-boost engine. Mega-Evolving a Pokémon grants a same-type Candy /
// Candy XL bonus on every raid completed and wild Pokémon caught of a type the
// mega SHARES — and only one mega can be evolved at a time (bonuses don't stack).
// So the question per boss / per habitat block is: which single mega, evolved
// before you battle, boosts the most of what you'll catch?
//
// Suggestions are drawn ONLY from megas that share a type with the boss (no
// shared type → no candy bonus), then ranked by a fixed priority:
//   1. also an attacking counter (super-effective)          → "attacker" (purple)
//   2. also shares the habitat's featured wild-spawn type    → "wild"     (blue)
//   3. only matches the boss                                 → "boss"     (no ring)
// The kind doubles as the sprite's outline color (see ui/megaSymbol colors).

import { MEGAS, type MegaForm } from "@/data/megas";
import { effectiveness } from "./counters";
import type { PType } from "@/data/attackers";

const ALL_TYPES = new Set<PType>([
  "Normal", "Fire", "Water", "Grass", "Electric", "Ice", "Fighting", "Poison",
  "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy",
]);

function asPTypes(types: readonly string[]): PType[] {
  return types.filter((t): t is PType => ALL_TYPES.has(t as PType));
}

const overlaps = (a: readonly string[], b: readonly string[]) => a.some((t) => b.includes(t));

export type MegaKind = "attacker" | "wild" | "boss";

export interface MegaBoost {
  mega: MegaForm;
  kind: MegaKind;
  /** Ranking score (higher = suggested first). */
  score: number;
}

/** Best super-effective attacking score (effectiveness × eDPS) a mega has vs a boss, or 0. */
function attackerScore(mega: MegaForm, defTypes: PType[]): number {
  let best = 0;
  for (const [t, dps] of Object.entries(mega.attacks) as [PType, number][]) {
    const mult = effectiveness(t, defTypes);
    if (mult > 1.01) best = Math.max(best, mult * dps);
  }
  return best;
}

const TIER = { attacker: 2000, wild: 1000, boss: 0 } as const;

/**
 * Ranked candy-boost megas for a single boss. `wildTypes` is the featured wild
 * spawn typing of the boss's habitat block (empty for all-weekend bosses), used
 * only to flag the "also boosts wild spawns" tier.
 */
export function megaBoostsForBoss(bossTypes: string[], wildTypes: string[] = []): MegaBoost[] {
  const def = asPTypes(bossTypes);
  if (def.length === 0) return [];
  const out: MegaBoost[] = [];
  for (const mega of MEGAS) {
    if (!overlaps(mega.types, def)) continue; // no shared type → no candy bonus
    const atk = attackerScore(mega, def);
    const boostsWild = overlaps(mega.types, wildTypes);
    const overlap = mega.types.filter((t) => def.includes(t)).length;
    const kind: MegaKind = atk > 0 ? "attacker" : boostsWild ? "wild" : "boss";
    // Within a tier: attackers by combat value; others by how many of the boss's
    // types they cover (a dual-match is a surer boost), then raw attack power.
    const within = kind === "attacker" ? atk : overlap * 100 + maxDps(mega);
    out.push({ mega, kind, score: TIER[kind] + within });
  }
  return out.sort((a, b) => b.score - a.score || a.mega.name.localeCompare(b.mega.name));
}

function maxDps(mega: MegaForm): number {
  return Math.max(0, ...Object.values(mega.attacks));
}

/**
 * Ranked candy-boost megas for a whole habitat block: which single mega, evolved
 * for the hour, pays off across every boss in the block and the featured wild
 * spawns. Scored by total reach — attacker for N bosses (×3), candy-match for N
 * bosses (×1), and how many of its types are the featured wild spawn (×2) — so a
 * mega that fights well, boosts many targets, and matches the wild theme (e.g.
 * Mega Rayquaza at Dragonflight Summit) rises to the top. Only megas that boost
 * at least one target in the block are included.
 */
export function blockMegaBoosts(wildTypes: string[], bossTypesList: string[][]): MegaBoost[] {
  const defs = bossTypesList.map(asPTypes).filter((d) => d.length > 0);
  const out: MegaBoost[] = [];
  for (const mega of MEGAS) {
    let candyMatches = 0;
    let attackerHits = 0;
    for (const def of defs) {
      if (overlaps(mega.types, def)) candyMatches++;
      if (attackerScore(mega, def) > 0) attackerHits++;
    }
    if (candyMatches === 0) continue;
    const wildHits = mega.types.filter((t) => wildTypes.includes(t)).length;
    const score = attackerHits * 3 + candyMatches * 1 + wildHits * 2;
    const kind: MegaKind = attackerHits > 0 ? "attacker" : wildHits > 0 ? "wild" : "boss";
    out.push({ mega, kind, score });
  }
  return out.sort((a, b) => b.score - a.score || a.mega.name.localeCompare(b.mega.name));
}

/** Merge per-boss boost lists into one ranked list (best kind/score per mega). */
export function mergeMegaBoosts(lists: MegaBoost[][]): MegaBoost[] {
  const best = new Map<string, MegaBoost>();
  for (const list of lists) {
    for (const b of list) {
      const cur = best.get(b.mega.name);
      if (!cur || b.score > cur.score) best.set(b.mega.name, b);
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score || a.mega.name.localeCompare(b.mega.name));
}

/** Deduped species (preserve rank order) for a "& mega3" search string. */
export function megaBoostSpecies(boosts: MegaBoost[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { mega } of boosts) {
    const key = mega.species.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(mega.species);
    }
  }
  return out;
}
