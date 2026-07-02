// Pass economics — "how many PokéCoins to merely OWN the raid passes your goals
// need?" as a lowest–highest range.
//
// Raids split into in-person vs remote (from the remote allocations; region-
// locked targets are always remote) and normal vs Super Mega (Mega Mewtwo X/Y).
// Free Orange daily passes are applied first (9/weekend day + 2/Road-of-Legends
// weekday played), so playing more days lowers the bill. The paid remainder:
//   • in-person  → Premium Battle Pass ("green"): 3-pack (high) or bulk box (low)
//   • remote     → Remote Raid Pass ("blue"): 3-pack (no big packs exist)
//   • remote Super Mega → ALSO 200 Link Charges each (mandatory). Owned Link
//     Charges pay this first; if the user opts in, leftover owned LC also stand
//     in for paid in-person Mega (150) / Super Mega (200) raids, freeing passes.
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
  /** In-person raids beyond the free passes that still need a bought green pass
   *  (after any Link-Charge substitutions). */
  paidInPerson: number;
  totalRemote: number;
  /** Link Charges that must be BOUGHT (mandatory remote-Super-Mega LC beyond
   *  what the user already owns). */
  linkChargesNeeded: number;
  /** Owned Link Charges actually put to use. */
  linkChargesUsed: number;
  /** In-person Mega/Super-Mega raids paid with owned Link Charges instead of a
   *  green pass (only when the user opted in). */
  passesSavedByLinkCharges: number;
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
  linkChargesToBuy: number;
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
    out.push(
      `${d.remoteBundles}× 3-Remote-Pass bundle (${PE.remote.bundleCoins} ea) = ${d.remoteBundles * PE.remote.bundleCoins} coins`,
    );
  }
  if (d.linkChargesToBuy > 0 && d.lc.counts.length) {
    const packs = d.lc.counts.map((c) => `${c.n}× ${c.lc} LC (${c.coins})`).join(" + ");
    out.push(`Link Charges (${d.linkChargesToBuy}) for remote Super Mega raids: ${packs} = ${d.lc.coins} coins`);
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
  const LC = PE.linkCharge;

  // Split by tier — only Mega (150 LC) and Super Mega (200 LC) raids can use Link
  // Charges — and by in-person vs remote.
  let megaInPerson = 0,
    megaRemote = 0;
  let superInPerson = 0,
    superRemote = 0;
  let otherInPerson = 0,
    otherRemote = 0;
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
    if (isMewtwoId(input.bossId) || boss.tier === "super-mega") {
      superInPerson += inPerson;
      superRemote += remote;
    } else if (boss.tier === "mega") {
      megaInPerson += inPerson;
      megaRemote += remote;
    } else {
      otherInPerson += inPerson;
      otherRemote += remote;
    }
  }

  const superMegaInPerson = superInPerson;
  const remoteSuperMega = superRemote;
  const totalInPerson = megaInPerson + superInPerson + otherInPerson;
  const totalRemote = megaRemote + superRemote + otherRemote;
  const weekdaysPlayed = Object.values(playDays).filter(Boolean).length;
  const freePasses = PE.freePassesPerWeekendDay * GAME_CONFIG.event.days + PE.freePassesPerRoadDay * weekdaysPlayed;
  const freePassesUsed = Math.min(freePasses, totalInPerson);

  // A REMOTE Super Mega raid mandatorily costs 200 Link Charges (on top of a
  // Remote Pass). Owned Link Charges pay this first.
  const mandatoryLc = remoteSuperMega * LC.perSuperMegaRaid;
  let lcPool = clampInt(settings.linkChargesOwned);
  const mandatoryFromOwned = Math.min(lcPool, mandatoryLc);
  lcPool -= mandatoryFromOwned;
  const linkChargesNeeded = mandatoryLc - mandatoryFromOwned; // LC to buy

  // Paid in-person raids (beyond the free dailies). Free passes are assumed to
  // cover the cheapest raids first (5★ → Mega → Super Mega), leaving the
  // Link-Charge-eligible Megas most likely to still be paid.
  const paidTotal = Math.max(0, totalInPerson - freePassesUsed);
  const paidOther = Math.min(otherInPerson, paidTotal);
  let rem = paidTotal - paidOther;
  const paidMega = Math.min(megaInPerson, rem);
  rem -= paidMega;
  const paidSuper = Math.min(superInPerson, rem);

  // Optionally spend remaining owned Link Charges on paid in-person Mega (150)
  // then Super Mega (200) raids — each frees a green pass. The optimal play.
  let passesSavedByLinkCharges = 0;
  if (settings.useLinkCharges) {
    const coverMega = Math.min(paidMega, Math.floor(lcPool / LC.perMegaRaid));
    lcPool -= coverMega * LC.perMegaRaid;
    const coverSuper = Math.min(paidSuper, Math.floor(lcPool / LC.perSuperMegaRaid));
    lcPool -= coverSuper * LC.perSuperMegaRaid;
    passesSavedByLinkCharges = coverMega + coverSuper;
  }
  const paidInPerson = Math.max(0, paidTotal - passesSavedByLinkCharges);
  const linkChargesUsed = mandatoryFromOwned + (clampInt(settings.linkChargesOwned) - mandatoryFromOwned - lcPool);
  const lc = linkChargeCost(linkChargesNeeded);

  const greenBundles = Math.ceil(paidInPerson / PE.green.bundlePasses);
  const remoteBundles = Math.ceil(totalRemote / PE.remote.bundlePasses);
  const ctx: MethodCtx = { greenBundles, remoteBundles, paidInPerson, totalRemote, lc, linkChargesToBuy: linkChargesNeeded };

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
    remoteNormalRaids: megaRemote + otherRemote,
    remoteSuperMegaRaids: remoteSuperMega,
    superMegaInPersonRaids: superMegaInPerson,
    freePasses,
    freePassesUsed,
    paidInPerson,
    totalRemote,
    linkChargesNeeded,
    linkChargesUsed,
    passesSavedByLinkCharges,
    weekdaysPlayed,
    hasCost: high.total > 0 || low.total > 0,
    low,
    high,
  };
}
