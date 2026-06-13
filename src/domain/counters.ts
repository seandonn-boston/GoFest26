// Counter engine: cross-references a boss's (dual-)type weaknesses against the
// ranked attacker pools (data/attackers.ts) to pick the best counters per
// category. Pure domain logic — no React/browser APIs, unit-testable.

import { ATTACKERS, type Attacker, type AttackerCategory, type PType } from "@/data/attackers";

/** All 18 types, used to scan every attacking type against a boss. */
const ALL_TYPES: PType[] = [
  "Normal", "Fire", "Water", "Grass", "Electric", "Ice", "Fighting", "Poison",
  "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy",
];

// Pokémon GO type chart, from the attacker's perspective. SUPER = defender
// types this attacking type is super-effective against; RESIST = types that
// resist it. The eight main-series immunities are handled separately (see
// IMMUNE below) as double resistances, since PoGo has no true immunities.
const SUPER: Record<PType, PType[]> = {
  Normal: [],
  Fire: ["Grass", "Ice", "Bug", "Steel"],
  Water: ["Fire", "Ground", "Rock"],
  Grass: ["Water", "Ground", "Rock"],
  Electric: ["Water", "Flying"],
  Ice: ["Grass", "Ground", "Flying", "Dragon"],
  Fighting: ["Normal", "Ice", "Rock", "Dark", "Steel"],
  Poison: ["Grass", "Fairy"],
  Ground: ["Fire", "Electric", "Poison", "Rock", "Steel"],
  Flying: ["Grass", "Fighting", "Bug"],
  Psychic: ["Fighting", "Poison"],
  Bug: ["Grass", "Psychic", "Dark"],
  Rock: ["Fire", "Ice", "Flying", "Bug"],
  Ghost: ["Psychic", "Ghost"],
  Dragon: ["Dragon"],
  Dark: ["Psychic", "Ghost"],
  Steel: ["Ice", "Rock", "Fairy"],
  Fairy: ["Fighting", "Dragon", "Dark"],
};

const RESIST: Record<PType, PType[]> = {
  Normal: ["Rock", "Steel", "Ghost"],
  Fire: ["Fire", "Water", "Rock", "Dragon"],
  Water: ["Water", "Grass", "Dragon"],
  Grass: ["Fire", "Grass", "Poison", "Flying", "Bug", "Dragon", "Steel"],
  Electric: ["Electric", "Grass", "Dragon", "Ground"],
  Ice: ["Fire", "Water", "Ice", "Steel"],
  Fighting: ["Poison", "Flying", "Psychic", "Bug", "Fairy", "Ghost"],
  Poison: ["Poison", "Ground", "Rock", "Ghost", "Steel"],
  Ground: ["Grass", "Bug", "Flying"],
  Flying: ["Electric", "Rock", "Steel"],
  Psychic: ["Psychic", "Steel", "Dark"],
  Bug: ["Fire", "Fighting", "Poison", "Flying", "Ghost", "Steel", "Fairy"],
  Rock: ["Fighting", "Ground", "Steel"],
  Ghost: ["Dark", "Normal"],
  Dragon: ["Steel", "Fairy"],
  Dark: ["Fighting", "Dark", "Fairy"],
  Steel: ["Fire", "Water", "Electric", "Steel"],
  Fairy: ["Fire", "Poison", "Steel"],
};

const SE = 1.6;
const NVE = 0.625; // 1 / 1.6
const DOUBLE_NVE = 0.390625; // 1 / 1.6²  — Pokémon GO's stand-in for a main-series immunity

// Pokémon GO has NO immunities: every type can damage every other type. The
// eight main-series immunities are instead doubly-resisted (0.390625×). Listing
// them separately keeps the resistances above true single-resists (0.625×) and
// makes dual-type products (e.g. Ground vs a Steel/Flying boss) accurate.
const IMMUNE: Record<PType, PType[]> = {
  Normal: ["Ghost"],
  Fighting: ["Ghost"],
  Ground: ["Flying"],
  Electric: ["Ground"],
  Psychic: ["Dark"],
  Ghost: ["Normal"],
  Dragon: ["Fairy"],
  Poison: ["Steel"],
  Fire: [], Water: [], Grass: [], Ice: [], Flying: [], Bug: [], Rock: [], Dark: [], Steel: [], Fairy: [],
};

/** Effectiveness of one attacking type against one defending type (Pokémon GO). */
function singleMult(atk: PType, def: PType): number {
  if (SUPER[atk].includes(def)) return SE;
  if (IMMUNE[atk].includes(def)) return DOUBLE_NVE;
  if (RESIST[atk].includes(def)) return NVE;
  return 1;
}

/** Effectiveness against a (possibly dual-type) defender — the product. */
export function effectiveness(atk: PType, defTypes: PType[]): number {
  return defTypes.reduce((m, d) => m * singleMult(atk, d), 1);
}

export interface Weakness {
  type: PType;
  /** Combined effectiveness multiplier (e.g. 1.6 or 2.56 for a double weakness). */
  mult: number;
}

/** A picked counter: the attacker plus the move type and score that won it the slot. */
export interface ScoredCounter {
  attacker: Attacker;
  /** Attacking type that scored best against this boss. */
  via: PType;
  score: number;
}

export interface CounterBreakdown {
  /** Types this boss takes super-effective damage from, strongest first. */
  weaknesses: Weakness[];
  /** Up to five best picks per category, score-ordered. */
  groups: Record<AttackerCategory, ScoredCounter[]>;
}

export const CATEGORY_ORDER: AttackerCategory[] = ["shadow", "mega", "legendary", "regular"];

const TOP_N = 5;

/**
 * Best counters for a boss of the given types, split into the four categories.
 * Only super-effective attackers are considered (the whole point of a counter
 * list); each is scored by effectiveness × that move type's eDPS so a glass
 * cannon on a double weakness can edge out a bulkier neutral-ish pick.
 */
export function counterBreakdown(types: string[]): CounterBreakdown {
  const defTypes = (types ?? []).filter((t): t is PType =>
    (ALL_TYPES as string[]).includes(t),
  );

  const weaknessMult = new Map<PType, number>();
  for (const atk of ALL_TYPES) {
    const m = effectiveness(atk, defTypes);
    if (m > 1.01) weaknessMult.set(atk, m);
  }

  const weaknesses: Weakness[] = [...weaknessMult.entries()]
    .map(([type, mult]) => ({ type, mult }))
    .sort((a, b) => b.mult - a.mult || a.type.localeCompare(b.type));

  const scored: ScoredCounter[] = [];
  for (const attacker of ATTACKERS) {
    let best: ScoredCounter | null = null;
    for (const [t, dps] of Object.entries(attacker.attacks) as [PType, number][]) {
      const mult = weaknessMult.get(t);
      if (!mult) continue; // not super-effective against this boss
      const score = mult * dps;
      if (!best || score > best.score) best = { attacker, via: t, score };
    }
    if (best) scored.push(best);
  }

  const groups = {} as Record<AttackerCategory, ScoredCounter[]>;
  for (const cat of CATEGORY_ORDER) {
    groups[cat] = scored
      .filter((s) => s.attacker.category === cat)
      .sort((a, b) => b.score - a.score || a.attacker.name.localeCompare(b.attacker.name))
      .slice(0, TOP_N);
  }

  return { weaknesses, groups };
}

/**
 * The single best raid attackers against a boss, across all categories, deduped
 * to one entry per species (the highest-scoring form wins) and score-ordered.
 * For a compact "best counters" list where the four-category split is too much.
 */
export function topCounters(types: string[], n = 6): ScoredCounter[] {
  const { groups } = counterBreakdown(types);
  const all = CATEGORY_ORDER.flatMap((c) => groups[c]).sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: ScoredCounter[] = [];
  for (const c of all) {
    const key = c.attacker.species.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
    if (out.length >= n) break;
  }
  return out;
}

/** All counter species (deduped, final-evolution names) across a set of bosses. */
export function counterSearchSpecies(bossTypes: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const types of bossTypes) {
    const { groups } = counterBreakdown(types);
    for (const cat of CATEGORY_ORDER) {
      for (const { attacker } of groups[cat]) {
        const key = attacker.species.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push(attacker.species);
        }
      }
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}
