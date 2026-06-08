import type { BossInput, Currency } from "./types";

/** A single currency credit toward a boss from completed research. */
export interface ResearchCredit {
  bossId: string;
  currency: Currency;
  amount: number;
}

/**
 * Returns inputs with research-reward credits folded into on-hand currency, so
 * the existing net-need math treats research rewards just like Candy/XL/Energy
 * you already hold. Pure — does not mutate the originals.
 */
export function applyResearchCredits(inputs: BossInput[], credits: ResearchCredit[]): BossInput[] {
  if (credits.length === 0) return inputs;

  const byBoss = new Map<string, { candy: number; xlCandy: number; megaEnergy: number }>();
  for (const c of credits) {
    const e = byBoss.get(c.bossId) ?? { candy: 0, xlCandy: 0, megaEnergy: 0 };
    e[c.currency] += c.amount;
    byBoss.set(c.bossId, e);
  }

  return inputs.map((inp) => {
    const e = byBoss.get(inp.bossId);
    if (!e) return inp;
    return {
      ...inp,
      current: {
        ...inp.current,
        candy: inp.current.candy + e.candy,
        xlCandy: inp.current.xlCandy + e.xlCandy,
        megaEnergy: inp.current.megaEnergy + e.megaEnergy,
      },
    };
  });
}
