// Transparency layer for the planning numbers: every load-bearing estimate, what
// it's worth, and where it comes from. Decoupled from GAME_CONFIG (which the
// engine reads) so surfacing confidence never risks the math.
//
// Confidence tiers:
//   verified  — confirmed against the PokeMiners GAME_MASTER or an official /
//               in-game source (dates, costs, prices, typings).
//   community — well-established community/empirical data not in GAME_MASTER
//               (drop quantities, catch candy, raiding pace).
//   estimated — our assumption; least certain, most worth re-confirming.

export type Confidence = "verified" | "community" | "estimated";

export interface EstimateNote {
  label: string;
  value: string;
  confidence: Confidence;
  note: string;
}

export const CONFIDENCE_META: Record<Confidence, { label: string; tone: string; dot: string }> = {
  verified: { label: "Verified", tone: "text-emerald-300", dot: "bg-emerald-400" },
  community: { label: "Community data", tone: "text-sky-300", dot: "bg-sky-400" },
  estimated: { label: "Estimated", tone: "text-amber-300", dot: "bg-amber-400" },
};

export const ESTIMATE_NOTES: EstimateNote[] = [
  // ---- Verified ----
  {
    label: "Event dates & hours",
    value: "Jul 11–12, 10 AM–7 PM local (9 h/day)",
    confidence: "verified",
    note: "Official GO Fest 2026: Global announcement.",
  },
  {
    label: "XL Candy to level 50",
    value: "296 / 360 / 272 (standard / shadow / purified)",
    confidence: "verified",
    note: "Cross-checked against the PokeMiners GAME_MASTER upgrade costs.",
  },
  {
    label: "Mewtwo Mega Energy",
    value: "7,500 first evolve · ~18,580 to Mega Level 4",
    confidence: "verified",
    note: "First-evolution cost from GAME_MASTER; ≥1 level pre-unlocked at GO Fest.",
  },
  {
    label: "Roster & type matchups",
    value: "All 92 bosses + counters",
    confidence: "verified",
    note: "Typings/forms validated against GAME_MASTER; counters from type effectiveness.",
  },
  {
    label: "Pass & Link Charge prices",
    value: "Green 250/3 · Remote 525/3 · 800 LC/Super Mega",
    confidence: "verified",
    note: "In-game shop, June 2026 (screenshot-confirmed).",
  },
  {
    label: "Free Raid Passes",
    value: "up to 9/day (2/day during Road of Legends)",
    confidence: "verified",
    note: "Official event bonuses.",
  },
  // ---- Community ----
  {
    label: "Catch Candy per raid",
    value: "3–6 (Pinap), +1 transfer, +1 mega-buddy",
    confidence: "community",
    note: "Established community drop data — not in GAME_MASTER.",
  },
  {
    label: "Legendary Candy XL per catch",
    value: "5–6 (guaranteed 3 + in-person completion)",
    confidence: "community",
    note: "Observed in-person Tier-5 rates; remote sees the 3-XL floor.",
  },
  {
    label: "Mega buddy XL boost",
    value: "+10% / +25% / +30% at Mega Level 2 / 3 / 4 (same-type)",
    confidence: "community",
    note: "A same-type Mega raises Candy-XL odds per roll; scales the assumed XL range. Excludes transfer/trade XL.",
  },
  {
    label: "Raiding pace",
    value: "battle + ~100 s catch + downtime → raids/hour",
    confidence: "community",
    note: "Empirical lobby/battle timings; the plan shows a min–max range.",
  },
  {
    label: "Candy to level 40",
    value: "~270 (only below L40)",
    confidence: "community",
    note: "Coarse community approximation; rarely the binding currency for a L50 goal.",
  },
  // ---- Estimated ----
  {
    label: "Mega Energy per raid",
    value: "Mega 150–250 · Super Mega 400–450",
    confidence: "estimated",
    note: "Sources conflict; the shakiest number — re-confirm once the event runs.",
  },
  {
    label: "Generic Mega level costs",
    value: "[0, 200, 360, 560]",
    confidence: "estimated",
    note: "Per-species varies; a specific boss can override it.",
  },
  {
    label: "Bulk-box pass value",
    value: "~50 coins/pass (lowest-cost path)",
    confidence: "estimated",
    note: "Boxes are personalized & change weekly — an editable best-case estimate.",
  },
];
