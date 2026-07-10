import type { ResearchCredit } from "@/domain/research";

/**
 * GO Pass Deluxe: Road of Legends — the rank-track currency rewards that feed
 * the raid math, credited as on-hand currency when the user says they'll buy
 * the pass (settings.goPassDeluxe) — the same pipeline as research rewards.
 *
 * source: confirmed — in-game rank track (Jul 2026 screenshots), ranks 1–100.
 * Buying Deluxe unlocks BOTH columns, so a Deluxe buyer banks the Basic-track
 * candy AND the Deluxe-track XL.
 *
 * Every credit carries the RANK it unlocks at, so a player mid-pass can say
 * "I'm rank N" (settings.goPassLevel) and only the ranks ABOVE N are credited
 * as incoming — everything at or below N was already claimed, which means it's
 * already sitting in the on-hand counts they typed in. Level 0 (the default)
 * credits the whole track.
 *
 * Per species featured on the track: Basic +10 Candy, Deluxe +10 Candy XL, one
 * rank per species (12–82). Specials: Mewtwo +10 Candy at each of ranks 90–93
 * and +10 XL at each of 91–93; Gardevoir Mega Energy ×300 (Deluxe rank 30);
 * Rare Candy XL ×10 (Deluxe rank 40) is flexible and NOT auto-credited (spend
 * it where you're shortest). Non-currency Deluxe perks (≈1,000 Link Charges,
 * 2,000 LC cap, hatch boosts) aren't credited here — add Link Charges to "what
 * you hold" yourself. The per-CATCH bonuses (+3 Candy / +1 XL) unlock at ranks
 * 2–3 and are applied whenever the pass is on regardless of level — a raider
 * below rank 2 clears those first point tasks within a raid or two.
 *
 * Ids are the app's PRIMARY (shared-resource) boss ids. Shared pools follow the
 * research convention of crediting every form that carries the mirrored pool
 * (Mewtwo X+Y; Solgaleo+Lunala for the Cosmog pool).
 */
export interface GoPassCredit extends ResearchCredit {
  /** The GO Pass rank this reward unlocks at (1–100). */
  rank: number;
}

// One rank each at +10 Candy (Basic) / +10 Candy XL (Deluxe) — rank read off
// the in-game track (screenshot-confirmed).
const TRACK_SPECIES: [bossId: string, rank: number][] = [
  ["articuno", 12],
  ["zapdos", 13],
  ["moltres", 14],
  ["raikou", 21],
  ["entei", 22],
  ["suicune", 23],
  ["lugia", 24],
  ["ho-oh", 25],
  ["regirock", 31],
  ["regice", 32],
  ["registeel", 33],
  ["latias", 34],
  ["latios", 35],
  ["kyogre", 36],
  ["groudon", 37],
  ["rayquaza", 38],
  ["uxie", 41],
  ["mesprit", 42],
  ["azelf", 43],
  ["dialga", 44],
  ["palkia", 45],
  ["giratina-altered", 46],
  ["heatran", 47],
  ["cresselia", 48],
  ["darkrai", 49],
  ["cobalion", 51],
  ["terrakion", 52],
  ["virizion", 53],
  ["tornadus-incarnate", 54],
  ["thundurus-incarnate", 55],
  ["landorus-incarnate", 56],
  ["reshiram", 57],
  ["zekrom", 58],
  ["kyurem", 59],
  ["xerneas", 61],
  ["yveltal", 62],
  ["tapu-lele", 64],
  ["tapu-bulu", 65],
  ["tapu-fini", 66],
  ["tapu-koko", 67],
  ["necrozma", 69],
  ["nihilego", 71],
  ["buzzwole", 72],
  ["pheromosa", 73],
  ["xurkitree", 74],
  ["celesteela", 75],
  ["kartana", 76],
  ["guzzlord", 77],
  ["stakataka", 78],
  ["blacephalon", 79],
  ["zacian", 81],
  ["zamazenta", 82],
];

// Shared pools credited to every mirrored form (research convention).
const COSMOG_POOL = ["solgaleo", "lunala"]; // rank 68 "Cosmog Candy / Candy XL"
const MEWTWO_POOL = ["mega-mewtwo-x", "mega-mewtwo-y"];
// Mewtwo: Basic +10 Candy at each of ranks 90–93; Deluxe +10 XL at 91–93.
const MEWTWO_CANDY_RANKS = [90, 91, 92, 93];
const MEWTWO_XL_RANKS = [91, 92, 93];

export const GO_PASS_DELUXE_CREDITS: GoPassCredit[] = [
  ...TRACK_SPECIES.flatMap(([bossId, rank]): GoPassCredit[] => [
    { bossId, currency: "candy", amount: 10, rank }, // Basic track
    { bossId, currency: "xlCandy", amount: 10, rank }, // Deluxe track
  ]),
  ...COSMOG_POOL.flatMap((bossId): GoPassCredit[] => [
    { bossId, currency: "candy", amount: 10, rank: 68 },
    { bossId, currency: "xlCandy", amount: 10, rank: 68 },
  ]),
  ...MEWTWO_POOL.flatMap((bossId): GoPassCredit[] => [
    ...MEWTWO_CANDY_RANKS.map((rank): GoPassCredit => ({ bossId, currency: "candy", amount: 10, rank })),
    ...MEWTWO_XL_RANKS.map((rank): GoPassCredit => ({ bossId, currency: "xlCandy", amount: 10, rank })),
  ]),
  // Deluxe rank 30: Gardevoir Mega Energy ×300.
  { bossId: "mega-gardevoir", currency: "megaEnergy", amount: 300, rank: 30 },
];

/** The rank-track credits still INCOMING for a player currently at `level` —
 *  ranks ≤ level were claimed already (they're in the typed-in on-hand counts),
 *  so only ranks above it count toward the plan. Level 0 = the whole track. */
export function goPassCreditsAboveRank(level: number): ResearchCredit[] {
  const safe = Number.isFinite(level) ? level : 0;
  return GO_PASS_DELUXE_CREDITS.filter((c) => c.rank > safe);
}
