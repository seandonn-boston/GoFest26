import type { Currency } from "@/domain/types";

/**
 * GO Fest 2026 research that yields currency relevant to raid planning.
 *
 * ⚠️ REWARD AMOUNTS ARE ESTIMATES. The official per-step reward tables (Leek
 * Duck / Serebii / GO Hub / the in-app research) were not machine-readable when
 * this was authored, so the Candy / XL / Mega Energy figures below are
 * best-effort placeholders flagged with `estimated: true`. Correct them here in
 * one place once the real numbers are known — the UI and the calculations pick
 * up the change automatically.
 *
 * What IS confirmed:
 *  - The City Experience (Tokyo / Chicago / Copenhagen) has four "Trainer
 *    Challenge" Timed Researches; completing ≥2 lets you choose an encounter
 *    with Mega Mewtwo X or Y that has its first Mega Level already unlocked.
 *  - Mewtwo Mega Energy X / Y is earned from GO Fest Timed Research (and raids).
 *  - "A Thunderous Discovery" (Zeraora) is an 8-step in-person Special Research
 *    rewarding a Zeraora encounter; repeat completions give Zeraora Candy.
 */
export interface ResearchReward {
  /** Boss id this credits toward; omit for informational (non-roster) rewards. */
  bossId?: string;
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
  /** True => the reward amounts are estimates pending official numbers. */
  estimated: boolean;
  /** Currency rewards that feed the raid math. */
  rewards: ResearchReward[];
  /** Non-currency / informational rewards, for display only. */
  extras?: string[];
  note?: string;
}

/** The two Mewtwo branches are mutually exclusive — you pick one. */
export const MEWTWO_RESEARCH_IDS = ["research-mewtwo-x", "research-mewtwo-y"] as const;

export const RESEARCH_LINES: ResearchLine[] = [
  {
    id: "research-mewtwo-x",
    name: "Mega Mewtwo X — Trainer Challenge",
    kind: "timed",
    availability: "GO Fest Timed Research · pick X or Y after ≥2 City challenges",
    estimated: true,
    rewards: [
      { bossId: "mega-mewtwo-x", currency: "megaEnergy", amount: 100, label: "Mewtwo Mega Energy X" },
      { bossId: "mega-mewtwo-x", currency: "candy", amount: 20, label: "Mewtwo Candy" },
      { bossId: "mega-mewtwo-x", currency: "xlCandy", amount: 5, label: "Mewtwo XL Candy" },
    ],
    extras: ["Mega Mewtwo X encounter (first Mega Level already unlocked)"],
    note: "Branching research — choosing X means you don't also get the Y branch.",
  },
  {
    id: "research-mewtwo-y",
    name: "Mega Mewtwo Y — Trainer Challenge",
    kind: "timed",
    availability: "GO Fest Timed Research · pick X or Y after ≥2 City challenges",
    estimated: true,
    rewards: [
      { bossId: "mega-mewtwo-y", currency: "megaEnergy", amount: 100, label: "Mewtwo Mega Energy Y" },
      { bossId: "mega-mewtwo-y", currency: "candy", amount: 20, label: "Mewtwo Candy" },
      { bossId: "mega-mewtwo-y", currency: "xlCandy", amount: 5, label: "Mewtwo XL Candy" },
    ],
    extras: ["Mega Mewtwo Y encounter (first Mega Level already unlocked)"],
    note: "Branching research — choosing Y means you don't also get the X branch.",
  },
  {
    id: "research-zeraora",
    name: "A Thunderous Discovery (Zeraora)",
    kind: "special",
    availability: "In-person only · Tokyo / Chicago / Copenhagen · 8 steps",
    estimated: true,
    rewards: [], // Zeraora isn't a raid boss here, so no effect on raid counts.
    extras: [
      "Zeraora encounter (repeat completions give Zeraora Candy)",
      "Confirmed bundle: 2,026 XP · Wash Rotom · 26 Poké Balls",
    ],
    note: "Informational — Zeraora isn't a raid target, so this doesn't change your raid counts.",
  },
];
