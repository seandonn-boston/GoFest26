// Mega candy-boost engine. Mega-Evolving a Pokémon grants a same-type Candy /
// Candy XL bonus on every raid completed and wild Pokémon caught of a type the
// mega SHARES — and only one mega can be evolved at a time (bonuses don't stack).
// So the question per boss / per habitat block is: which single mega, evolved
// before you battle, boosts the most of what you'll catch?
//
// A mega is rated by three independent signals against a boss / hour-block:
//   B = shares a type with a raid boss (its candy bonus applies)
//   W = shares a type with the block's featured wild spawns
//   A = is a good (super-effective) attacker against the boss(es)
// The combination picks the outline colour (see megaTier): the three-signal
// "rainbow" is best, the medal tiers stack two signals, and the single-signal
// purple/blue/grey are the plain matches — grey (attacker only, no type match)
// being the least useful, since we mega-evolve mainly for the candy type match.

import { MEGAS, type MegaForm } from "@/data/megas";
import { effectiveness } from "./counters";
import type { PType } from "@/data/attackers";

const ALL_TYPES = new Set<PType>([
  "Normal",
  "Fire",
  "Water",
  "Grass",
  "Electric",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
]);

function asPTypes(types: readonly string[]): PType[] {
  return types.filter((t): t is PType => ALL_TYPES.has(t as PType));
}

const overlaps = (a: readonly string[], b: readonly string[]) => a.some((t) => b.includes(t));

export type MegaKind =
  | "rainbow" // boss-type + wild-type + attacker (all three)
  | "gold" // boss-type + wild-type, not an attacker
  | "silver" // boss-type + attacker, no wild match
  | "bronze" // wild-type + attacker, no boss-type match
  | "boss" // boss-type match only (purple)
  | "wild" // wild-type match only (blue)
  | "attacker"; // good attacker only, no type match (grey)

/** Outline kind from the three signals: boss-type (B), wild-type (W), attacker (A). */
export function megaTier(boss: boolean, wild: boolean, attacker: boolean): MegaKind {
  if (boss && wild && attacker) return "rainbow";
  if (boss && wild) return "gold";
  if (boss && attacker) return "silver";
  if (wild && attacker) return "bronze";
  if (boss) return "boss";
  if (wild) return "wild";
  return "attacker";
}

/** Sort weight by usefulness (rainbow best → attacker-only least). */
export const MEGA_KIND_RANK: Record<MegaKind, number> = {
  rainbow: 6,
  gold: 5,
  silver: 4,
  bronze: 3,
  boss: 2,
  wild: 1,
  attacker: 0,
};

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

/**
 * Ranked candy-boost megas for a single boss. `wildTypes` is the featured wild
 * spawn typing of the boss's habitat block (empty for all-weekend bosses). Every
 * suggestion shares a type with the boss (B is always true here), so kinds range
 * over rainbow / gold / silver / boss depending on the wild + attacker signals.
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
    const kind = megaTier(true, boostsWild, atk > 0);
    // Tier dominates; within a tier prefer combat value, then candy coverage.
    const within = atk > 0 ? atk : overlap * 100 + maxDps(mega);
    out.push({ mega, kind, score: MEGA_KIND_RANK[kind] * 100000 + within });
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
    const kind = megaTier(candyMatches > 0, wildHits > 0, attackerHits > 0);
    out.push({ mega, kind, score });
  }
  return out.sort((a, b) => b.score - a.score || a.mega.name.localeCompare(b.mega.name));
}

/**
 * The few megas genuinely WORTH evolving for an hour-block, ranked by a weighted
 * blend (item-13 spec) rather than the flat reach score above. Per the request:
 *
 *   1. same-type raid-boss coverage (40%) — count of the block's bosses this mega
 *      shares a type with (so its candy bonus applies), weighting a boss it can
 *      ALSO fight super-effectively as +2 ("good attacker vs its own-type
 *      matchup"), a plain same-type boss as +1, and a boss it isn't same-type
 *      with but still counters super-effectively as +1.
 *   2. featured wild-spawn matchups (30%) — how many of the hour's wild-spawn
 *      types the mega shares (its candy bonus extends to those catches too).
 *   3. good attacker WITH same-type (20%) — bosses it both shares a type with and
 *      hits super-effectively.
 *   4. good attacker WITHOUT same-type (10%) — bosses it only counters.
 *
 * Each component is normalized by the best value across candidate megas so the
 * 40/30/20/10 weights govern relative influence, not raw magnitude. Ties break to
 * the mega of the higher-priority target (when `prioritySpecies` is supplied),
 * then the stronger mega attacker, then name.
 */
export interface BlockMegaRank {
  mega: MegaForm;
  /** Combined weighted score in [0,1] (higher ranks first). */
  score: number;
  /** Outline kind from boss-type / wild-type / attacker signals (see megaTier). */
  kind: MegaKind;
  /** Weighted same-type coverage tally (component 1). */
  coverage: number;
  /** Block bosses whose candy this mega boosts (shares a type with). */
  bossesBoosted: number;
  /** Featured wild-spawn types shared (component 2). */
  wildMatches: number;
  /** Bosses it's a good attacker against AND shares a type with (component 3). */
  attackerSameType: number;
  /** Bosses it's a good attacker against but shares no type with (component 4). */
  attackerOffType: number;
}

const BLOCK_MEGA_WEIGHTS = { coverage: 0.4, wild: 0.3, attackerSame: 0.2, attackerOff: 0.1 } as const;

export function topBlockMegas(
  wildTypes: string[],
  bossTypesList: string[][],
  opts: { prioritySpecies?: string[]; limit?: number } = {},
): BlockMegaRank[] {
  const defs = bossTypesList.map(asPTypes).filter((d) => d.length > 0);
  type Raw = {
    mega: MegaForm;
    coverage: number;
    wild: number;
    attackerSame: number;
    attackerOff: number;
    candyBosses: number;
  };
  const raws: Raw[] = [];
  for (const mega of MEGAS) {
    let coverage = 0;
    let attackerSame = 0;
    let attackerOff = 0;
    let candyBosses = 0;
    for (const def of defs) {
      const shares = overlaps(mega.types, def);
      const attacks = attackerScore(mega, def) > 0;
      if (shares) {
        candyBosses++;
        coverage += attacks ? 2 : 1; // good attacker vs its own-type matchup = +2
        if (attacks) attackerSame++;
      } else if (attacks) {
        coverage += 1; // good counter even without a candy match
        attackerOff++;
      }
    }
    const wild = mega.types.filter((t) => wildTypes.includes(t)).length;
    // Worth evolving only if it boosts at least one boss's candy or a wild spawn.
    if (candyBosses === 0 && wild === 0) continue;
    raws.push({ mega, coverage, wild, attackerSame, attackerOff, candyBosses });
  }
  if (raws.length === 0) return [];

  // Normalize each component by the best candidate so the weights compare like
  // for like (max 1 guards against divide-by-zero when a component is all zero).
  const maxOf = (sel: (r: Raw) => number) => Math.max(1, ...raws.map(sel));
  const mc = maxOf((r) => r.coverage);
  const mw = maxOf((r) => r.wild);
  const ms = maxOf((r) => r.attackerSame);
  const mo = maxOf((r) => r.attackerOff);

  const priority = (opts.prioritySpecies ?? []).map((s) => s.toLowerCase());
  const priorityRank = (mega: MegaForm) => {
    const i = priority.indexOf(mega.species.toLowerCase());
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };

  const ranked: BlockMegaRank[] = raws.map((r) => ({
    mega: r.mega,
    kind: megaTier(r.candyBosses > 0, r.wild > 0, r.attackerSame + r.attackerOff > 0),
    coverage: r.coverage,
    bossesBoosted: r.candyBosses,
    wildMatches: r.wild,
    attackerSameType: r.attackerSame,
    attackerOffType: r.attackerOff,
    score:
      BLOCK_MEGA_WEIGHTS.coverage * (r.coverage / mc) +
      BLOCK_MEGA_WEIGHTS.wild * (r.wild / mw) +
      BLOCK_MEGA_WEIGHTS.attackerSame * (r.attackerSame / ms) +
      BLOCK_MEGA_WEIGHTS.attackerOff * (r.attackerOff / mo),
  }));

  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      priorityRank(a.mega) - priorityRank(b.mega) || // tie → mega of the higher-priority target
      maxDps(b.mega) - maxDps(a.mega) || // then the stronger mega attacker
      a.mega.name.localeCompare(b.mega.name),
  );
  return ranked.slice(0, opts.limit ?? 5);
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
