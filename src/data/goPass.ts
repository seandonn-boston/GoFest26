import type { ResearchCredit } from "@/domain/research";

/**
 * GO Pass Deluxe: Road of Legends — the rank-track currency rewards that feed
 * the raid math, credited as on-hand currency when the user says they'll buy
 * the pass (settings.goPassDeluxe) — the same pipeline as research rewards.
 *
 * source: confirmed — in-game rank track (Jul 2026 screenshots), ranks 1–100.
 * Buying Deluxe unlocks BOTH columns, so a Deluxe buyer banks the Basic-track
 * candy AND the Deluxe-track XL. Crediting assumes the pass is completed to
 * rank 100 (the point tasks — catches, raid wins, hatches — make that routine
 * for anyone raiding at GO Fest scale).
 *
 * Per species featured on the track: Basic +10 Candy, Deluxe +10 Candy XL.
 * Specials: Mewtwo +40 Candy (Basic ranks 90–93) and +30 XL (Deluxe 91–93);
 * Gardevoir Mega Energy ×300 (Deluxe rank 30); Rare Candy XL ×10 (Deluxe rank
 * 40) is flexible and NOT auto-credited (spend it where you're shortest).
 * Non-currency Deluxe perks (≈1,000 Link Charges, 2,000 LC cap, hatch boosts)
 * aren't credited here — add Link Charges to "what you hold" yourself.
 *
 * Ids are the app's PRIMARY (shared-resource) boss ids. Shared pools follow the
 * research convention of crediting every form that carries the mirrored pool
 * (Mewtwo X+Y; Solgaleo+Lunala for the Cosmog pool).
 */

// One rank each at +10 Candy (Basic) / +10 Candy XL (Deluxe), ranks 12–82.
const TRACK_SPECIES: string[] = [
  "articuno",
  "zapdos",
  "moltres",
  "raikou",
  "entei",
  "suicune",
  "lugia",
  "ho-oh",
  "regirock",
  "regice",
  "registeel",
  "latias",
  "latios",
  "kyogre",
  "groudon",
  "rayquaza",
  "uxie",
  "mesprit",
  "azelf",
  "dialga",
  "palkia",
  "giratina-altered",
  "heatran",
  "cresselia",
  "darkrai",
  "cobalion",
  "terrakion",
  "virizion",
  "tornadus-incarnate",
  "thundurus-incarnate",
  "landorus-incarnate",
  "reshiram",
  "zekrom",
  "kyurem",
  "xerneas",
  "yveltal",
  "tapu-lele",
  "tapu-bulu",
  "tapu-fini",
  "tapu-koko",
  "necrozma",
  "nihilego",
  "buzzwole",
  "pheromosa",
  "xurkitree",
  "celesteela",
  "kartana",
  "guzzlord",
  "stakataka",
  "blacephalon",
  "zacian",
  "zamazenta",
];

// Shared pools credited to every mirrored form (research convention).
const COSMOG_POOL = ["solgaleo", "lunala"]; // rank 68 "Cosmog Candy / Candy XL"
const MEWTWO_POOL = ["mega-mewtwo-x", "mega-mewtwo-y"];

export const GO_PASS_DELUXE_CREDITS: ResearchCredit[] = [
  ...TRACK_SPECIES.flatMap((bossId): ResearchCredit[] => [
    { bossId, currency: "candy", amount: 10 }, // Basic track
    { bossId, currency: "xlCandy", amount: 10 }, // Deluxe track
  ]),
  ...COSMOG_POOL.flatMap((bossId): ResearchCredit[] => [
    { bossId, currency: "candy", amount: 10 },
    { bossId, currency: "xlCandy", amount: 10 },
  ]),
  // Mewtwo: Basic 90–93 = 40 Candy; Deluxe 91–93 = 30 Candy XL.
  ...MEWTWO_POOL.flatMap((bossId): ResearchCredit[] => [
    { bossId, currency: "candy", amount: 40 },
    { bossId, currency: "xlCandy", amount: 30 },
  ]),
  // Deluxe rank 30: Gardevoir Mega Energy ×300.
  { bossId: "mega-gardevoir", currency: "megaEnergy", amount: 300 },
];
