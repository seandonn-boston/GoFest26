// Generic "show your work" layer for the dashboard's derived numbers. Where
// explain.ts handles a single boss's currency need (with editable inputs), these
// builders explain the AGGREGATE plan values — total raids, capacity, goal
// progress and pass cost — as read-only equation tokens. Each builder takes the
// already-computed values (the same ones the UI renders) and formats the steps
// that produced them, so the tooltip always matches what's on screen.

import { midpoint } from "@/lib/math";
import type { ExplainLine, Token } from "./explain";
import type { PassCost } from "./passEconomy";
import type { CapacityModel, Range } from "./types";

export interface Explanation {
  title: string;
  lines: ExplainLine[];
  note?: string;
}

const txt = (s: string): Token => ({ t: "text", s });
const cst = (n: number, title?: string): Token => ({ t: "const", n, title });
const out = (s: string): Token => ({ t: "out", s });

const fmtN = (n: number) => Math.round(n).toLocaleString();
const rng = (r: Range) => (r.min === r.max ? fmtN(r.min) : `${fmtN(r.min)}–${fmtN(r.max)}`);

/** Total raids across selected bosses = the sum of each boss's raid range. */
export function explainTotalRaids(parts: { name: string; raids: Range }[], total: Range): Explanation {
  const contributing = parts.filter((p) => p.raids.max > 0);
  const lines: ExplainLine[] = contributing.map((p) => ({
    tokens: [txt(`${p.name}:`), out(`${rng(p.raids)} raids`)],
  }));
  if (contributing.length === 0) {
    lines.push({ tokens: [txt("No raids needed yet — set targets above.")] });
  } else if (contributing.length > 1) {
    lines.push({ tokens: [txt("Total ="), out(`${rng(total)} raids`)] });
  }
  return { title: "Total raids needed", lines };
}

/** Raids/hour = 3600s ÷ (battle + catch + downtime), fastest and slowest case. */
export function explainRaidsPerHour(cap: CapacityModel): Explanation {
  const fast = cap.battleSecRange.min + cap.catchSec + cap.downtimeSecRange.min;
  const slow = cap.battleSecRange.max + cap.catchSec + cap.downtimeSecRange.max;
  return {
    title: "Raids per hour",
    lines: [
      {
        tokens: [
          txt("Fastest:"),
          cst(cap.battleSecRange.min, "fastest battle (full lobby)"),
          txt("s battle +"),
          cst(cap.catchSec, "normal catch"),
          txt("s catch +"),
          cst(cap.downtimeSecRange.min, "least walking"),
          txt(`s = ${fast}s → ⌊3600/${fast}⌋ =`),
          out(`${cap.raidsPerHour.max}/h`),
        ],
      },
      {
        tokens: [
          txt("Slowest:"),
          cst(cap.battleSecRange.max, "slowest battle (thin lobby / Mewtwo)"),
          txt("s +"),
          cst(cap.catchSec, "normal catch"),
          txt("s +"),
          cst(cap.downtimeSecRange.max, "most walking"),
          txt(`s = ${slow}s → ⌊3600/${slow}⌋ =`),
          out(`${cap.raidsPerHour.min}/h`),
        ],
      },
    ],
    note: `Assumes a ${cap.lobbySize}-trainer lobby.`,
  };
}

/** Max raids = in-person weekend capacity, plus any opted-in remote pool. */
export function explainMaxRaids(cap: CapacityModel, remotePool: number, maxRaids: Range): Explanation {
  const lines: ExplainLine[] = [
    {
      tokens: [
        txt("In person:"),
        out(`${rng(cap.raidsPerHour)}/h`),
        txt(`× ${cap.hoursPerDay}h × ${cap.days} days =`),
        out(`${rng(cap.totalRaids)}`),
      ],
    },
  ];
  if (remotePool > 0) {
    lines.push({
      tokens: [txt("+ remote pool"), cst(remotePool, "opted-in remote passes"), txt("→"), out(`${rng(maxRaids)}`)],
    });
  }
  return { title: "Max raids this weekend", lines };
}

/** Capacity used = need (midpoint) ÷ max raids (midpoint). */
export function explainUtilization(total: Range, maxRaids: Range, utilization: number): Explanation {
  return {
    title: "Weekend capacity used",
    lines: [
      {
        tokens: [
          txt("Need (mid)"),
          out(`${fmtN(midpoint(total))}`),
          txt("÷ max (mid)"),
          out(`${fmtN(midpoint(maxRaids))}`),
          txt("="),
          out(`${Math.round(utilization * 100)}%`),
        ],
      },
    ],
    note: "Over 100% means your goals don't fit the time — trim, prioritize, or add remote raids.",
  };
}

/** Goal progress = raids that fit the windows ÷ raids required. */
export function explainGoalProgress(achievable: number, required: number): Explanation {
  const pct = required > 0 ? Math.round((achievable / required) * 100) : 100;
  return {
    title: "Raids toward your goals",
    lines: [
      {
        tokens: [
          txt("Can place"),
          out(`${fmtN(achievable)}`),
          txt("of"),
          out(`${fmtN(required)}`),
          txt("required ="),
          out(`${pct}%`),
        ],
      },
    ],
    note: "Counts only raids that fit each boss's time windows (plus remote), in priority order.",
  };
}

/** PokéCoin pass cost: free passes first, then paid Premium / Remote / Link Charges. */
export function explainPassCost(cost: PassCost): Explanation {
  const lines: ExplainLine[] = [
    { tokens: [txt("Free daily passes used:"), out(`${cost.freePassesUsed}`), txt(`of ${cost.freePasses}`)] },
  ];
  if (cost.paidInPerson > 0) {
    lines.push({
      tokens: [txt(`Premium × ${cost.paidInPerson} =`), out(`${fmtN(cost.low.greenCoins)}–${fmtN(cost.high.greenCoins)}`)],
    });
  }
  if (cost.totalRemote > 0) {
    lines.push({
      tokens: [txt(`Remote × ${cost.totalRemote} =`), out(`${fmtN(cost.low.remoteCoins)}–${fmtN(cost.high.remoteCoins)}`)],
    });
  }
  if (cost.remoteSuperMegaRaids > 0) {
    lines.push({
      tokens: [
        txt(`Link Charges (${fmtN(cost.linkChargesNeeded)} for ${cost.remoteSuperMegaRaids} remote Mewtwo) =`),
        out(`${fmtN(cost.high.linkChargeCoins)}`),
      ],
    });
  }
  lines.push({
    tokens: [txt("Lowest"), out(`${fmtN(cost.low.total)}`), txt("· Highest"), out(`${fmtN(cost.high.total)}`), txt("coins")],
  });
  return {
    title: "Pass cost · PokéCoins",
    lines,
    note: "Free daily passes are applied first; singles excluded (3-pack+ only).",
  };
}
