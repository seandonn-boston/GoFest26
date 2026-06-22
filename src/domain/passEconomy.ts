// Pass economics — "how many PokéCoins to merely OWN the raid passes your goals
// need?" as a lowest–highest range.
//
// Raids split into in-person vs remote (from the remote allocations; region-
// locked targets are always remote) and normal vs Super Mega (Mega Mewtwo X/Y).
// Free Orange daily passes are applied first (9/weekend day + 2/Road-of-Legends
// weekday played), so playing more days lowers the bill. The paid remainder:
//   • in-person  → Premium Battle Pass ("green"): 3-pack (high) or bulk box (low)
//   • remote     → Remote Raid Pass ("blue"): 3-pack (no big packs exist)
//   • remote Super Mega → ALSO 800 Link Charges each (in-person Super Mega uses
//     the pass we already counted — Link Charges in person are never cheaper).
// Singles are excluded (no one buys the single green/remote pass).

import { GAME_CONFIG } from "@/data/config";
import { getBoss, MEWTWO_X_ID, MEWTWO_Y_ID } from "@/data";
import { collapseForms } from "./forms";
import { bossIsLocal } from "./region";
import { sized } from "./blockPlan";
import { DEFAULT_SETTINGS, type PlannerSettings } from "./settings";
import type { BossInput, BossResult } from "./types";

const PE = GAME_CONFIG.passEconomy;

export interface PassCostLine {
  greenCoins: number;
  remoteCoins: number;
  linkChargeCoins: number;
  total: number;
  /** Human "how to buy it" steps. */
  methods: string[];
}

export interface PassCost {
  /** Total in-person raids needed (normal + Super Mega). */
  inPersonRaids: number;
  remoteNormalRaids: number;
  remoteSuperMegaRaids: number;
  superMegaInPersonRaids: number;
  /** Free Orange passes available across the days played. */
  freePasses: number;
  freePassesUsed: number;
  /** In-person raids beyond the free passes (need a green pass). */
  paidInPerson: number;
  totalRemote: number;
  linkChargesNeeded: number;
  weekdaysPlayed: number;
  /** True when any coins are required. */
  hasCost: boolean;
  low: PassCostLine;
  high: PassCostLine;
}

const isMewtwoId = (id: string) => id === MEWTWO_X_ID || id === MEWTWO_Y_ID;
const clampInt = (n: number) => Math.max(0, Math.round(Number.isFinite(n) ? n : 0));

/** Fewest coins to buy at least `targetLc` Link Charges from the configured packs. */
export function linkChargeCost(targetLc: number): { coins: number; counts: { lc: number; coins: number; n: number }[] } {
  if (targetLc <= 0) return { coins: 0, counts: [] };
  const [big, small] = PE.linkCharge.packs; // best per-LC first
  let bestCoins = Infinity;
  let best: [number, number] = [0, 0];
  for (let b = 0; b <= Math.ceil(targetLc / big.lc); b++) {
    const s = Math.max(0, Math.ceil((targetLc - b * big.lc) / small.lc));
    const coins = b * big.coins + s * small.coins;
    if (coins < bestCoins) {
      bestCoins = coins;
      best = [b, s];
    }
  }
  const counts = [
    { lc: big.lc, coins: big.coins, n: best[0] },
    { lc: small.lc, coins: small.coins, n: best[1] },
  ].filter((c) => c.n > 0);
  return { coins: bestCoins, counts };
}

interface MethodCtx {
  greenBundles: number;
  remoteBundles: number;
  paidInPerson: number;
  totalRemote: number;
  lc: ReturnType<typeof linkChargeCost>;
  remoteSuperMega: number;
}

function buildMethods(kind: "low" | "high", d: MethodCtx): string[] {
  const out: string[] = [];
  if (d.paidInPerson > 0) {
    out.push(
      kind === "high"
        ? `${d.greenBundles}× 3-Premium-Pass bundle (${PE.green.bundleCoins} ea) = ${d.greenBundles * PE.green.bundleCoins} coins`
        : `~${d.paidInPerson} Premium Passes from a bulk box (~${PE.green.bestBoxCoinsPerPass}/pass) ≈ ${Math.round(d.paidInPerson * PE.green.bestBoxCoinsPerPass)} coins`,
    );
  }
  if (d.totalRemote > 0) {
    out.push(`${d.remoteBundles}× 3-Remote-Pass bundle (${PE.remote.bundleCoins} ea) = ${d.remoteBundles * PE.remote.bundleCoins} coins`);
  }
  if (d.remoteSuperMega > 0 && d.lc.counts.length) {
    const packs = d.lc.counts.map((c) => `${c.n}× ${c.lc} LC (${c.coins})`).join(" + ");
    out.push(
      `Link Charges for ${d.remoteSuperMega} remote Super Mega raid${d.remoteSuperMega === 1 ? "" : "s"}: ${packs} = ${d.lc.coins} coins`,
    );
  }
  if (!out.length) out.push("Free daily passes cover your plan — 0 coins.");
  return out;
}

/**
 * Cost (in PokéCoins) to own the passes a plan needs, as a lowest–highest range.
 * `headStart`/weekend split is irrelevant to the count — an in-person raid is an
 * in-person raid wherever it falls — but the weekdays played add free passes.
 */
export function computePassCost(
  inputs: BossInput[],
  results: BossResult[],
  settings: PlannerSettings = DEFAULT_SETTINGS,
  remoteAllocations: Record<string, number> = {},
  playDays: Record<string, boolean> = {},
): PassCost {
  const rewardCase = settings.rewardCase;
  const resById = new Map(results.map((r) => [r.bossId, r]));
  const collapsed = collapseForms(inputs);

  let normalInPerson = 0;
  let normalRemote = 0;
  let superMegaInPerson = 0;
  let remoteSuperMega = 0;
  for (const input of collapsed) {
    if (!input.selected) continue;
    const boss = getBoss(input.bossId);
    const res = resById.get(input.bossId);
    if (!boss || !res) continue;
    const required = sized(res.raids, rewardCase);
    if (required <= 0) continue;
    const local = bossIsLocal(boss, settings.region);
    // Remote portion: what the user assigned remotely (region-locked → all of it).
    let remote = settings.useRemoteRaids ? Math.min(required, clampInt(remoteAllocations[input.bossId])) : 0;
    if (!local) remote = required;
    const inPerson = Math.max(0, required - remote);
    if (isMewtwoId(input.bossId)) {
      superMegaInPerson += inPerson;
      remoteSuperMega += remote;
    } else {
      normalInPerson += inPerson;
      normalRemote += remote;
    }
  }

  const totalInPerson = normalInPerson + superMegaInPerson;
  const weekdaysPlayed = Object.values(playDays).filter(Boolean).length;
  const freePasses = PE.freePassesPerWeekendDay * GAME_CONFIG.event.days + PE.freePassesPerRoadDay * weekdaysPlayed;
  const freePassesUsed = Math.min(freePasses, totalInPerson);
  const paidInPerson = totalInPerson - freePassesUsed;
  const totalRemote = normalRemote + remoteSuperMega;
  const linkChargesNeeded = remoteSuperMega * PE.linkCharge.perSuperMegaRaid;
  const lc = linkChargeCost(linkChargesNeeded);

  const greenBundles = Math.ceil(paidInPerson / PE.green.bundlePasses);
  const remoteBundles = Math.ceil(totalRemote / PE.remote.bundlePasses);
  const ctx: MethodCtx = { greenBundles, remoteBundles, paidInPerson, totalRemote, lc, remoteSuperMega };

  // Highest = standard 3-packs (bundle-rounded). Lowest = best bulk-box per-pass.
  const highGreen = greenBundles * PE.green.bundleCoins;
  const highRemote = remoteBundles * PE.remote.bundleCoins;
  const lowGreen = Math.round(paidInPerson * PE.green.bestBoxCoinsPerPass);
  const lowRemote = Math.round(totalRemote * PE.remote.bestBoxCoinsPerPass);

  const high: PassCostLine = {
    greenCoins: highGreen,
    remoteCoins: highRemote,
    linkChargeCoins: lc.coins,
    total: highGreen + highRemote + lc.coins,
    methods: buildMethods("high", ctx),
  };
  const low: PassCostLine = {
    greenCoins: lowGreen,
    remoteCoins: lowRemote,
    linkChargeCoins: lc.coins,
    total: lowGreen + lowRemote + lc.coins,
    methods: buildMethods("low", ctx),
  };

  return {
    inPersonRaids: totalInPerson,
    remoteNormalRaids: normalRemote,
    remoteSuperMegaRaids: remoteSuperMega,
    superMegaInPersonRaids: superMegaInPerson,
    freePasses,
    freePassesUsed,
    paidInPerson,
    totalRemote,
    linkChargesNeeded,
    weekdaysPlayed,
    hasCost: high.total > 0 || low.total > 0,
    low,
    high,
  };
}
