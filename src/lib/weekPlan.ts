import { GAME_CONFIG } from "@/data/config";
import { getBoss } from "@/data";
import { spriteUrl } from "@/data/bosses";
import { energyGoalsFor } from "@/data/energyGoals";
import { hourLabel } from "@/lib/format";
import type { RoadPlan, WeekendBlockPlan, RoadDayPlan, BlockSpeciesShare } from "@/domain";
import type { Currency } from "@/domain/types";

/**
 * The chronological "Week Plan" — one line per (day/window, boss) the plan
 * commits raids to, Road of Legends weekdays first, then the weekend habitat
 * blocks, then the remote pool. Built from the SAME computed plans the UI
 * renders, and shared by the Results-step tracker AND the Excel export so the
 * two can never disagree about what a week of raiding looks like.
 */
export interface WeekPlanLine {
  /** Stable key into the store's `raidsDone` record (`bossId@sat6`,
   *  `energy:kyurem:white@tue`, `bossId@remote`) — weekend keys intentionally
   *  match the keys the block accordion has always written. */
  doneKey: string;
  /** Which chunk of the week the line belongs to (for grouping/banding). */
  group: "road" | "sat" | "sun" | "remote";
  /** e.g. "Monday · Jul 6", "Sat · Jul 11", "Any day". */
  dayLabel: string;
  /** e.g. "6–7 PM · 5★ hour", "Wings of Fire · 10 AM–1 PM". */
  window: string;
  bossId: string;
  bossName: string;
  /** Resolved sprite URL (forme-aware; fusion/primal sources included). */
  sprite?: string;
  /** Raids this plan schedules on this line (the tracker's target). */
  target: number;
  /** What one raid banks, e.g. "Fusion Energy + Candy" / "Candy + XL Candy". */
  banks: string;
  pass: "In-person" | "Remote";
  /** Top counters, comma-joined (the Excel sheet prints these). */
  counters: string;
}

const DAY_LABEL: Record<string, string> = {
  sat: "Sat · Jul 11",
  sun: "Sun · Jul 12",
};

const CURRENCY_LABEL: Record<Currency, string> = {
  candy: "Candy",
  xlCandy: "XL Candy",
  megaEnergy: "Mega Energy",
};

/** "6–7 PM · 5★ hour" / "6–8 PM · 5★ marathon" / "7–8 PM · Mega & Primal hour". */
function roadWindow(day: RoadDayPlan, share: BlockSpeciesShare): string {
  const megaHour = "7–8 PM · Mega & Primal hour";
  if (share.energyKey) {
    const def = energyGoalsFor(share.bossId).find((d) => d.key === share.energyKey);
    return def?.kind === "primal" ? megaHour : day.id === "mon" ? "6–8 PM · 5★ marathon" : "6–7 PM · 5★ hour";
  }
  const boss = getBoss(share.formeBossId ?? share.bossId);
  if (boss?.tier === "mega" || boss?.tier === "super-mega") return megaHour;
  return day.id === "mon" ? "6–8 PM · 5★ marathon" : "6–7 PM · 5★ hour";
}

/** What one raid of this row banks, e.g. "Fusion Energy + Candy" / "Candy + XL". */
function banksLabel(share: BlockSpeciesShare): string {
  if (share.energyKey) {
    const def = energyGoalsFor(share.bossId).find((d) => d.key === share.energyKey);
    const kind = def?.kind === "primal" ? "Primal" : def?.kind === "crowned" ? "Crowned" : "Fusion";
    return `${kind} Energy + Candy`;
  }
  const boss = getBoss(share.formeBossId ?? share.bossId);
  const currencies = boss?.rewardsCurrencies ?? ["candy", "xlCandy"];
  return currencies.map((c) => CURRENCY_LABEL[c]).join(" + ");
}

function countersLabel(share: BlockSpeciesShare): string {
  const boss = getBoss(share.formeBossId ?? share.bossId);
  return (boss?.bestCounters ?? []).slice(0, 4).join(", ");
}

function shareSprite(share: BlockSpeciesShare): string | undefined {
  if (share.sprite) return spriteUrl(share.sprite);
  return getBoss(share.formeBossId ?? share.bossId)?.sprite;
}

/** The `raidsDone` key for a share in a window. Weekend keys match the ones the
 *  block accordion historically wrote (`rayquaza@sat6`), so logged progress
 *  survives this tracker taking over the logging. */
function doneKey(share: BlockSpeciesShare, windowKey: string): string {
  const id = share.energyKey ? `energy:${share.bossId}:${share.energyKey}` : share.bossId;
  return `${id}@${windowKey}`;
}

export function weekPlanLines(road: RoadPlan, weekend: WeekendBlockPlan): WeekPlanLine[] {
  const startLocal = GAME_CONFIG.event.hourStartLocal;
  const lines: WeekPlanLine[] = [];
  for (const day of road.days) {
    for (const s of day.species) {
      if (s.fitted <= 0) continue;
      lines.push({
        doneKey: doneKey(s, day.id),
        group: "road",
        dayLabel: `${day.label} · ${day.dateLabel}`,
        window: roadWindow(day, s),
        bossId: s.bossId,
        bossName: s.bossName,
        sprite: shareSprite(s),
        target: s.fitted,
        banks: banksLabel(s),
        pass: "In-person",
        counters: countersLabel(s),
      });
    }
  }
  for (const block of weekend.blocks) {
    for (const s of block.species) {
      if (s.fitted <= 0) continue;
      lines.push({
        doneKey: doneKey(s, `${block.day}${block.startHour}`),
        group: block.day,
        dayLabel: DAY_LABEL[block.day] ?? block.day,
        window: `${block.name} · ${hourLabel(block.startHour, startLocal)}–${hourLabel(block.endHour, startLocal)}`,
        bossId: s.bossId,
        bossName: s.bossName,
        sprite: shareSprite(s),
        target: s.fitted,
        banks: banksLabel(s),
        pass: "In-person",
        counters: countersLabel(s),
      });
    }
  }
  for (const s of weekend.remote?.species ?? []) {
    if (s.fitted <= 0) continue;
    lines.push({
      doneKey: doneKey(s, "remote"),
      group: "remote",
      dayLabel: "Any day",
      window: "Remote — any time (Jul 6–12)",
      bossId: s.bossId,
      bossName: s.bossName,
      sprite: shareSprite(s),
      target: s.fitted,
      banks: banksLabel(s),
      pass: "Remote",
      counters: countersLabel(s),
    });
  }
  return lines;
}
