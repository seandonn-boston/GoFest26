// Shared-resource multi-form species helpers. Giratina, Dialga, Palkia and the
// genie quartet each have two formes that draw from ONE Candy / Candy XL pool, so
// the planner treats a group as a single resource target — one raids-needed total
// that can be hunted across every block any forme appears in — while counters and
// mega suggestions stay per-forme. Mewtwo X/Y is excluded (separate energy pools).

import { getBoss } from "@/data";
import { FORM_GROUPS, PRIMARY_FORM_ID } from "@/data/formGroups";
import { pokemonSearchName, speciesKey } from "@/lib/pokemonSearch";
import { MAX_REMOTE_PER_SPECIES } from "./settings";
import type { BossInput, HabitatWindow, RaidBoss } from "./types";

/** All forme bosses of a group (primary first), resolved from the roster. */
export function formMembers(group: string): RaidBoss[] {
  return (FORM_GROUPS[group] ?? []).map((m) => getBoss(m.id)).filter((b): b is RaidBoss => !!b);
}

/**
 * The title for a (possibly grouped) boss's combined card / option. A same-
 * species forme group reads as the plain species ("Giratina"); a cross-species
 * shared-candy group (Solgaleo + Lunala, both Cosmog Candy) joins its members'
 * labels so the one combined card names both. Non-grouped bosses pass through.
 */
export function groupDisplayName(boss: RaidBoss): string {
  if (!boss.formGroup) return boss.name;
  const members = formMembers(boss.formGroup);
  const distinct = new Set(members.map((m) => speciesKey(m.name)));
  if (distinct.size <= 1) return pokemonSearchName(boss.name);
  return members.map((m) => m.formLabel ?? pokemonSearchName(m.name)).join(" & ");
}

/** True for a non-primary forme (its pool lives on the group's primary forme). */
export function isSecondaryForm(boss: RaidBoss): boolean {
  return !!boss.formGroup && !boss.formPrimary;
}

/** The primary (resource-carrying) forme id for a group. */
export function primaryFormId(group: string): string {
  return PRIMARY_FORM_ID[group];
}

/**
 * Planning windows for a boss: the UNION of all its group's formes' windows, so a
 * shared-resource species can be hunted across every block any forme appears in
 * (e.g. Dialga on Saturday AND its Origin forme on Sunday) regardless of which
 * forme the user selected. Non-grouped bosses use their own windows.
 */
export function planningWindows(boss: RaidBoss): HabitatWindow[] {
  if (!boss.formGroup) return boss.windows;
  return formMembers(boss.formGroup).flatMap((b) => b.windows);
}

/**
 * The forme of a (possibly grouped) boss that's available in a given block — used
 * so a dual-day species shows its Saturday forme on Saturday and its Origin forme
 * on Sunday. Falls back to the boss itself (non-grouped, or no forme matches).
 */
export function formeInBlock(boss: RaidBoss, block: HabitatWindow): RaidBoss {
  if (!boss.formGroup) return boss;
  const hit = formMembers(boss.formGroup).find((m) =>
    m.windows.some((w) => w.day === block.day && w.startHour < block.endHour && w.endHour > block.startHour),
  );
  return hit ?? boss;
}

/** True when a group's formes appear on both Saturday and Sunday. */
export function groupSpansBothDays(group: string): boolean {
  const days = new Set(formMembers(group).flatMap((b) => b.windows.map((w) => w.day)));
  return days.has("sat") && days.has("sun");
}

/**
 * Which weekend day(s) a target can be remote-raided on. A single-day boss is
 * reachable on its day plus the ADJACENT-timezone day only — Saturday bosses
 * Fri–Sun, Sunday bosses Sat–Mon — so it can never use both the Friday AND Monday
 * windows, capping its whole side at one day's worth (Fri/Mon 10 + shared 40 =
 * 50). A both-day shared-resource group (Dialga, Palkia) has a forme each day, so
 * it spans both and can use the full budget. Mewtwo X (Sat) / Y (Sun) are each
 * single-day — you allocate them separately, one per side.
 */
export function remoteDaySide(boss: RaidBoss): "sat" | "sun" | "both" {
  if (boss.formGroup && groupSpansBothDays(boss.formGroup)) return "both";
  const days = new Set(planningWindows(boss).map((w) => w.day));
  if (days.has("sat") && days.has("sun")) return "both";
  return days.has("sun") ? "sun" : "sat";
}

/**
 * Per-species remote-raid cap. A both-day species (Dialga, Palkia) can be remoted
 * across both days, up to the full budget; a single-day target (Celesteela, and
 * each Mewtwo form on its own day) is one day's worth — Fri/Mon 10 + shared 40,
 * i.e. ≤ MAX_REMOTE_PER_SPECIES (50).
 */
export function remoteCapFor(boss: RaidBoss, budget: number): number {
  if (remoteDaySide(boss) === "both") return budget;
  return Math.min(MAX_REMOTE_PER_SPECIES, budget);
}

/**
 * Collapse a raw input list into the planner's effective targets: each shared-
 * resource form group becomes a SINGLE input (its primary forme), selected when
 * ANY forme is selected; secondary formes are dropped so their shared Candy/XL
 * pool isn't double-counted. Non-grouped inputs pass through unchanged.
 */
export function collapseForms(inputs: BossInput[]): BossInput[] {
  const anySelected = new Map<string, boolean>();
  for (const i of inputs) {
    const group = getBoss(i.bossId)?.formGroup;
    if (group) anySelected.set(group, (anySelected.get(group) ?? false) || i.selected);
  }
  const out: BossInput[] = [];
  for (const i of inputs) {
    const boss = getBoss(i.bossId);
    if (!boss?.formGroup) {
      out.push(i);
    } else if (!isSecondaryForm(boss)) {
      out.push({ ...i, selected: anySelected.get(boss.formGroup) ?? i.selected });
    }
  }
  return out;
}
