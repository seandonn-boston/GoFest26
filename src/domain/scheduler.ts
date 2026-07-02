import { getBoss } from "@/data";
import { habitatAt } from "@/data/habitats";
import { midpoint } from "@/lib/math";
import { recommendBuddy } from "./buddyBoost";
import { bossIsLocal, regionScopeLabel } from "./region";
import { DEFAULT_SETTINGS, type PlannerSettings } from "./settings";
import type {
  BossInput,
  BossResult,
  CapacityModel,
  EventDay,
  PassType,
  RaidBoss,
  Schedule,
  ScheduledRaid,
  UnmetGoal,
} from "./types";

const DAYS: EventDay[] = ["sat", "sun"];

interface Slot {
  day: EventDay;
  hour: number;
  slotInHour: number;
  /** Selected boss ids available to raid in this slot. */
  available: string[];
  bossId?: string;
}

/** Sizes how many raids of a boss to schedule, per the configured reward case. */
function demandFor(result: BossResult, settings: PlannerSettings): number {
  const r = result.raids;
  switch (settings.rewardCase) {
    case "optimistic":
      return r.min;
    case "safe":
      return r.max;
    default:
      return Math.ceil(midpoint(r));
  }
}

function isAvailable(boss: RaidBoss, day: EventDay, hour: number): boolean {
  if (boss.allWeekend) return true;
  return boss.windows.some((w) => w.day === day && hour >= w.startHour && hour < w.endHour);
}

/** Planning raids/hour: the realistic mid-estimate, sizing the slot grid. */
function planningRaidsPerHour(capacity: CapacityModel): number {
  return Math.max(1, Math.round(midpoint(capacity.raidsPerHour)));
}

/**
 * Builds an hour-by-hour weekend plan.
 *
 * Strategy — scarcity-first greedy: bosses with the fewest available slots
 * relative to their demand (limited-window legendaries) are placed first, into
 * the tightest slots; all-weekend bosses (Mega Mewtwo) naturally backfill
 * whatever capacity is left and stop once their demand is met, so Mewtwo never
 * overshoots and never crowds out the limited-time bosses.
 */
export function computeSchedule(
  inputs: BossInput[],
  results: BossResult[],
  capacity: CapacityModel,
  settings: PlannerSettings = DEFAULT_SETTINGS,
): Schedule {
  const perHour = planningRaidsPerHour(capacity);
  const resultById = new Map(results.map((r) => [r.bossId, r]));

  const selectedBosses = inputs
    .filter((i) => i.selected)
    .map((i) => getBoss(i.bossId))
    .filter((b): b is RaidBoss => !!b);

  const selectedMegas = selectedBosses.filter((b) => b.tier === "mega" || b.tier === "super-mega");

  // 1. Build the slot grid and annotate availability.
  const slots: Slot[] = [];
  for (const day of DAYS) {
    for (let hour = 0; hour < capacity.hoursPerDay; hour++) {
      for (let s = 0; s < perHour; s++) {
        slots.push({
          day,
          hour,
          slotInHour: s,
          available: selectedBosses.filter((b) => isAvailable(b, day, hour)).map((b) => b.id),
        });
      }
    }
  }

  // 2. Compute demand and available-slot counts per boss.
  const demand = new Map<string, number>();
  const availCount = new Map<string, number>();
  for (const boss of selectedBosses) {
    const result = resultById.get(boss.id);
    const d = result ? demandFor(result, settings) : 0;
    if (d > 0) demand.set(boss.id, d);
    availCount.set(boss.id, slots.filter((slot) => slot.available.includes(boss.id)).length);
  }

  // 3. Scarcity-first order: smallest (availableSlots / demand) first.
  const order = [...demand.keys()].sort((a, b) => {
    const sa = (availCount.get(a) ?? 0) / (demand.get(a) ?? 1);
    const sb = (availCount.get(b) ?? 0) / (demand.get(b) ?? 1);
    if (sa !== sb) return sa - sb;
    return (availCount.get(a) ?? 0) - (availCount.get(b) ?? 0);
  });

  // 4. Assign each boss into its tightest open slots (fewest alternatives first).
  // Remote passes are unlimited during GO Fest 2026, so out-of-region bosses
  // aren't capped per day here (the block plan models remote time separately).
  const maxRemote = Number.MAX_SAFE_INTEGER;
  const dayRemote: Record<EventDay, number> = { sat: 0, sun: 0 };

  const unmetGoals: UnmetGoal[] = [];
  for (const bossId of order) {
    const boss = getBoss(bossId);
    const remote = boss ? !bossIsLocal(boss, settings.region) : false;
    const need = demand.get(bossId) ?? 0;
    const candidates = slots
      .filter((slot) => !slot.bossId && slot.available.includes(bossId))
      .sort((x, y) => {
        if (x.available.length !== y.available.length) return x.available.length - y.available.length;
        if (x.day !== y.day) return x.day === "sat" ? -1 : 1;
        if (x.hour !== y.hour) return x.hour - y.hour;
        return x.slotInHour - y.slotInHour;
      });

    let assigned = 0;
    for (const slot of candidates) {
      if (assigned >= need) break;
      if (remote) {
        if (dayRemote[slot.day] < maxRemote) dayRemote[slot.day]++;
        else break; // remote-raid budget exhausted
      }
      slot.bossId = bossId;
      assigned++;
    }

    if (assigned < need) {
      const result = resultById.get(bossId);
      unmetGoals.push({
        bossId,
        bossName: getBoss(bossId)?.name ?? bossId,
        currency: result?.bindingCurrency ?? null,
        shortfall: need - assigned,
      });
    }
  }

  // 5. Emit raids in chronological order, assigning buddy + pass per raid.
  const assigned = slots
    .filter((slot) => slot.bossId)
    .sort((x, y) => {
      if (x.day !== y.day) return x.day === "sat" ? -1 : 1;
      if (x.hour !== y.hour) return x.hour - y.hour;
      return x.slotInHour - y.slotInHour;
    });

  // Free Orange passes per day.
  const orangeCap: Record<EventDay, number> = {
    sat: settings.freeDailyPerDay,
    sun: settings.freeDailyPerDay,
  };
  const orangeUsed: Record<EventDay, number> = { sat: 0, sun: 0 };

  const raids: ScheduledRaid[] = assigned.map((slot) => {
    const boss = getBoss(slot.bossId!)!;
    const buddy = recommendBuddy(boss, selectedMegas);
    const local = bossIsLocal(boss, settings.region);

    // Out-of-region bosses need a Remote Raid Pass. Local raids use a free
    // Orange pass first, then unlimited Green passes / Link Charges.
    let passType: PassType;
    if (!local) {
      passType = "remote";
    } else if (orangeUsed[slot.day] < orangeCap[slot.day]) {
      passType = "orange";
      orangeUsed[slot.day] += 1;
    } else {
      passType = "green";
    }

    return {
      day: slot.day,
      hour: slot.hour,
      slotInHour: slot.slotInHour,
      bossId: boss.id,
      bossName: boss.name,
      tier: boss.tier,
      recommendedBuddyMegaId: buddy?.id,
      recommendedBuddyMegaName: buddy?.name,
      passType,
      counters: boss.bestCounters.slice(0, 3),
      habitat: habitatAt(slot.day, slot.hour)?.name,
      remote: !local,
      regionLabel: regionScopeLabel(boss.region),
    };
  });

  return {
    raids,
    feasible: unmetGoals.length === 0,
    unmetGoals,
    planningRaidsPerHour: perHour,
  };
}
