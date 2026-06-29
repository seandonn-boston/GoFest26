import { useDeferredValue, useEffect, useMemo } from "react";
import {
  autoRemoteAllocations,
  computeBlockPlan,
  computePlanSummary,
  computePassCoverage,
  computeRoadPlan,
  globalPriorityFromBlocks,
  type PassCoverage,
  type RoadPlan,
  type SpeciesPassNeed,
  type WeekendBlockPlan,
} from "@/domain";
import { applyResearchCredits, type ResearchCredit } from "@/domain/research";
import { midpoint } from "@/lib/math";
import { RESEARCH_LINES } from "@/data/research";
import { getBoss } from "@/data";
import type { PlanSummary } from "@/domain/types";
import { usePlannerStore, selectedInPriorityOrder } from "@/store/usePlannerStore";

/**
 * Recomputes the full plan summary whenever inputs, settings, or research
 * change. The store reads are run through useDeferredValue so a burst of rapid
 * selections (tapping many bosses fast) coalesces into far fewer of these
 * expensive recomputes — React keeps the selection UI responsive and runs the
 * heavy math once the burst settles, instead of synchronously on every tap.
 */
export function usePlannerResults(): PlanSummary {
  const inputs = useDeferredValue(usePlannerStore((s) => s.inputs));
  const settings = useDeferredValue(usePlannerStore((s) => s.settings));
  const research = useDeferredValue(usePlannerStore((s) => s.research));
  const remoteAllocations = useDeferredValue(usePlannerStore((s) => s.remoteAllocations));
  return useMemo(() => {
    // Fold enabled research rewards into on-hand currency before planning.
    const credits: ResearchCredit[] = [];
    for (const line of RESEARCH_LINES) {
      if (!research[line.id]) continue;
      for (const r of line.rewards) {
        for (const id of r.bossIds ?? []) {
          credits.push({ bossId: id, currency: r.currency, amount: r.amount });
        }
      }
    }
    const credited = applyResearchCredits(Object.values(inputs), credits);
    return computePlanSummary(credited, settings, remoteAllocations);
  }, [inputs, settings, research, remoteAllocations]);
}

/**
 * The per-habitat-block plan (capacity, Mewtwo balancing, risk bands) layered on
 * top of the summary, plus the Road of Legends weekday plan. Separate hook so it
 * can read the priority order + play-days, which live in the store rather than in
 * the planner settings. The weekday plan's head start reduces the weekend demand.
 */
export function useBlockPlan(summary: PlanSummary): { weekend: WeekendBlockPlan; road: RoadPlan } {
  const inputs = useDeferredValue(usePlannerStore((s) => s.inputs));
  const settings = useDeferredValue(usePlannerStore((s) => s.settings));
  const blockPriority = useDeferredValue(usePlannerStore((s) => s.blockPriority));
  const remoteAllocations = useDeferredValue(usePlannerStore((s) => s.remoteAllocations));
  const quickCatchBlocks = useDeferredValue(usePlannerStore((s) => s.quickCatchBlocks));
  const playDays = useDeferredValue(usePlannerStore((s) => s.playDays));
  const roadTargets = useDeferredValue(usePlannerStore((s) => s.roadTargets));
  return useMemo(() => {
    const list = Object.values(inputs);
    const road = computeRoadPlan(
      list,
      summary.results,
      summary.capacity,
      settings,
      playDays,
      blockPriority,
      remoteAllocations,
      quickCatchBlocks,
      roadTargets,
    );
    const weekend = computeBlockPlan(
      list,
      summary.results,
      summary.capacity,
      settings,
      blockPriority,
      remoteAllocations,
      quickCatchBlocks,
      road.headStart,
    );
    return { weekend, road };
  }, [inputs, summary, settings, blockPriority, remoteAllocations, quickCatchBlocks, playDays, roadTargets]);
}

/**
 * Allocates the user's owned raid passes across their selected targets in global
 * priority order, so owned passes cover the most-important goals and the rest is
 * what they'd need to buy. Pure of the weekend plan — it's a have/need/buy view.
 */
export function usePassCoverage(summary: PlanSummary): PassCoverage {
  const inputs = usePlannerStore((s) => s.inputs);
  const globalPriority = usePlannerStore((s) => s.globalPriority);
  const passesOwned = usePlannerStore((s) => s.settings.passesOwned);
  return useMemo(() => {
    const order = selectedInPriorityOrder({ inputs, globalPriority });
    const byId = new Map(summary.results.map((r) => [r.bossId, r]));
    const ordered: SpeciesPassNeed[] = order
      .map((id) => {
        const r = byId.get(id);
        if (!r || r.raids.max <= 0) return null;
        return { bossId: id, bossName: getBoss(id)?.name ?? id, raids: r.raids };
      })
      .filter((x): x is SpeciesPassNeed => x !== null);
    return computePassCoverage(ordered, passesOwned);
  }, [inputs, globalPriority, passesOwned, summary.results]);
}

/** The id→count entries that actually matter (positive), for stable comparison. */
function sameAllocation(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (Math.max(0, a[k] ?? 0) !== Math.max(0, b[k] ?? 0)) return false;
  }
  return true;
}

/**
 * Keeps remote allocations balanced by priority while in auto mode. Recomputes
 * from a *remote-off* block plan (so shortfalls are real, not already covered by
 * the current allocation) every time goals or priority change, and writes the
 * result back — so dragging the priority list re-flows the 60-pass budget to the
 * now-higher-priority targets. A single manual edit flips `remoteAuto` off and
 * this becomes a no-op until the user taps "Auto-balance" again.
 */
export function useRemoteAutoBalance(summary: PlanSummary): void {
  const inputs = usePlannerStore((s) => s.inputs);
  const settings = usePlannerStore((s) => s.settings);
  const blockPriority = usePlannerStore((s) => s.blockPriority);
  const remoteAuto = usePlannerStore((s) => s.remoteAuto);
  const remoteAllocations = usePlannerStore((s) => s.remoteAllocations);
  const playDays = usePlannerStore((s) => s.playDays);
  const setRemoteAllocations = usePlannerStore((s) => s.setRemoteAllocations);

  useEffect(() => {
    if (!settings.useRemoteRaids || !remoteAuto) return;
    const inputList = Object.values(inputs);
    // Remote raids are an event-wide pool, so they rank by a single priority
    // derived from the per-block orders.
    const globalOrder = globalPriorityFromBlocks(blockPriority);
    // The Road of Legends head start already covers some demand — net it out so
    // remote isn't assigned to raids the player will do on a weekday.
    const road = computeRoadPlan(inputList, summary.results, summary.capacity, settings, playDays, blockPriority);
    // Shortfalls must be measured with remote OFF, otherwise goals already
    // covered by the current allocation read as "met" and the budget unwinds.
    const offPlan = computeBlockPlan(
      inputList,
      summary.results,
      summary.capacity,
      { ...settings, useRemoteRaids: false },
      blockPriority,
      {},
      {},
      road.headStart,
    );
    const desired = autoRemoteAllocations(
      offPlan,
      inputList,
      summary.results,
      settings,
      globalOrder,
      midpoint(summary.capacity.remoteCapacity),
    );
    if (!sameAllocation(desired, remoteAllocations)) setRemoteAllocations(desired);
  }, [inputs, settings, blockPriority, remoteAuto, remoteAllocations, playDays, summary, setRemoteAllocations]);
}
