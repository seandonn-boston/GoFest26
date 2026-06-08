import type { Currency } from "@/domain/types";

/**
 * GO Fest 2026 research that yields currency relevant to raid planning.
 *
 * Reward amounts below are transcribed from Serebii's listings for the in-person
 * City Experience (the "Chicago Expert" Mewtwo research and the 8-step Zeraora
 * "A Thunderous Discovery"). The free Global event may differ; correct the
 * numbers here in one place if so — the UI and calculations update automatically.
 *
 * Notably, the Mewtwo branching research grants Mewtwo Candy + XL (shared across
 * the X/Y branch you pick) and a pre-unlocked Mewtwo encounter, but NO Mewtwo
 * Mega Energy — that comes from Super Mega Raids.
 */
export interface ResearchReward {
  /** Boss ids this credits toward; omit/empty = informational (non-roster). */
  bossIds?: string[];
  currency: Currency;
  amount: number;
  label: string;
}

export interface ResearchLine {
  id: string;
  name: string;
  kind: "timed" | "special";
  /** How it's obtained. */
  availability: string;
  /** True => reward amounts are estimates pending official numbers. */
  estimated: boolean;
  /** Currency rewards that feed the raid math. */
  rewards: ResearchReward[];
  /** Non-currency / informational rewards, for display only. */
  extras?: string[];
  note?: string;
}

// Mewtwo Candy/XL is shared across both Mega forms, so the branch reward credits
// whichever Mewtwo form you're working on.
const MEWTWO_IDS = ["mega-mewtwo-x", "mega-mewtwo-y"];

export const RESEARCH_LINES: ResearchLine[] = [
  {
    id: "research-mewtwo",
    name: "Mega Mewtwo Trainer Challenge (X / Y branch)",
    kind: "timed",
    availability: "In-person City Experience (per Serebii) · choose X or Y after ≥2 Trainer Challenges",
    estimated: false,
    rewards: [
      { bossIds: MEWTWO_IDS, currency: "candy", amount: 26, label: "Mewtwo Candy ×26" },
      { bossIds: MEWTWO_IDS, currency: "xlCandy", amount: 2, label: "Mewtwo XL Candy ×2" },
      { bossIds: MEWTWO_IDS, currency: "xlCandy", amount: 6, label: "Rare Candy XL ×6 (→ Mewtwo XL)" },
    ],
    extras: [
      "Mewtwo encounter — X or Y form, first Mega Level already unlocked",
      "No Mewtwo Mega Energy from this research (Energy comes from Super Mega Raids)",
    ],
    note: "Shared Mewtwo Candy/XL applies whichever branch (X or Y) you pick. Rare Candy XL is flexible — counted here as Mewtwo XL.",
  },
  {
    id: "research-zeraora",
    name: "A Thunderous Discovery (Zeraora)",
    kind: "special",
    availability: "In-person only · Tokyo / Chicago / Copenhagen · 8 steps",
    estimated: false,
    rewards: [], // Zeraora isn't a raid boss here, so no effect on raid counts.
    extras: [
      "Zeraora encounter + Zeraora Candy ×3 + Zeraora Candy XL ×6",
      "9 Rare Candy XL total (flexible — usable on any Pokémon)",
      "Lots of Stardust (2,026 ×), Rare Candy, items & costumed encounters",
    ],
    note: "Informational — Zeraora isn't a raid target, so it doesn't change raid counts. (Its 9 Rare Candy XL could be spent on a raid Pokémon if you choose.)",
  },
];
