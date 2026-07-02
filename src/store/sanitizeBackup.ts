import { getBoss } from "@/data";
import { makeDefaultInput } from "@/domain/defaults";
import { DEFAULT_SETTINGS, type PlannerSettings, type CalibrationMetric } from "@/domain/settings";
import { DEFAULT_REGION } from "@/data/locations";
import type { BossInput, EnergyProgress, PokemonCopy, UserRegion, Variant } from "@/domain/types";
import type { StateBackup } from "./stateBackup";

/**
 * Coerce an imported / shared backup into a fully valid shape BEFORE it reaches
 * the store. A share link (#plan=…) or uploaded .json/.xlsx is attacker-reachable
 * and only loosely validated by `isStateBackup`, so without this a crafted file
 * could seed the engine with the wrong types (missing `current`/`target`, a
 * non-array `copies`, a garbage `region`) and crash a render. Every field is
 * rebuilt from defaults + type-checked values; unknown boss ids (incl. `__proto__`)
 * are dropped, so there's no prototype-pollution or crash surface.
 */

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown, fb: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fb);
const nonNeg = (v: unknown, fb: number): number => Math.max(0, num(v, fb));
const bool = (v: unknown, fb: boolean): boolean => (typeof v === "boolean" ? v : fb);
const isStr = (v: unknown): v is string => typeof v === "string";

const VARIANTS: readonly Variant[] = ["standard", "shadow", "purified"];
const variant = (v: unknown, fb: Variant): Variant => (VARIANTS.includes(v as Variant) ? (v as Variant) : fb);

const optMegaLevelY = (o: Record<string, unknown>): number | undefined =>
  o.megaLevelY !== undefined ? num(o.megaLevelY, 0) : undefined;

function sanitizeCopy(raw: unknown, i: number): PokemonCopy {
  const c = isObj(raw) ? raw : {};
  const cur = isObj(c.current) ? c.current : {};
  const tgt = isObj(c.target) ? c.target : {};
  return {
    id: isStr(c.id) ? c.id : `c${i}`,
    variant: variant(c.variant, "standard"),
    lucky: typeof c.lucky === "boolean" ? c.lucky : undefined,
    maxMoves: typeof c.maxMoves === "boolean" ? c.maxMoves : undefined,
    current: { level: num(cur.level, 40), megaLevel: num(cur.megaLevel, 0), megaLevelY: optMegaLevelY(cur) },
    target: { level: num(tgt.level, 50), megaLevel: num(tgt.megaLevel, 0), megaLevelY: optMegaLevelY(tgt) },
  };
}

function sanitizeCopies(raw: unknown): PokemonCopy[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  return raw.map(sanitizeCopy);
}

function sanitizeEnergy(raw: unknown): Record<string, EnergyProgress> | undefined {
  if (!isObj(raw)) return undefined;
  const out: Record<string, EnergyProgress> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === "__proto__" || !isObj(v)) continue;
    out[k] = { have: nonNeg(v.have, 0), goal: nonNeg(v.goal, 0), on: bool(v.on, false) };
  }
  return Object.keys(out).length ? out : undefined;
}

function sanitizeInput(bossId: string, raw: unknown): BossInput {
  // Start from a fully-formed default for the boss, then overlay typed values.
  const base = makeDefaultInput(getBoss(bossId)!);
  if (!isObj(raw)) return base;
  const cur = isObj(raw.current) ? raw.current : {};
  const tgt = isObj(raw.target) ? raw.target : {};
  const cnt = isObj(raw.counts) ? raw.counts : {};
  return {
    ...base,
    selected: bool(raw.selected, base.selected),
    counts: {
      standard: nonNeg(cnt.standard, base.counts.standard),
      shadow: nonNeg(cnt.shadow, base.counts.shadow),
      purified: nonNeg(cnt.purified, base.counts.purified),
    },
    quantity: Math.max(1, Math.round(num(raw.quantity, base.quantity ?? 1))),
    variant: raw.variant !== undefined ? variant(raw.variant, "standard") : base.variant,
    current: {
      candy: nonNeg(cur.candy, base.current.candy),
      xlCandy: nonNeg(cur.xlCandy, base.current.xlCandy),
      megaEnergy: nonNeg(cur.megaEnergy, base.current.megaEnergy),
      level: num(cur.level, base.current.level),
      megaLevel: num(cur.megaLevel, base.current.megaLevel),
    },
    target: { level: num(tgt.level, base.target.level), megaLevel: num(tgt.megaLevel, base.target.megaLevel) },
    copies: sanitizeCopies(raw.copies),
    energy: sanitizeEnergy(raw.energy),
    megaBuddy: bool(raw.megaBuddy, base.megaBuddy ?? true),
    l4Buddy: typeof raw.l4Buddy === "boolean" ? raw.l4Buddy : undefined,
    presetId: isStr(raw.presetId) ? raw.presetId : undefined,
  };
}

function sanitizeInputs(raw: unknown): Record<string, BossInput> {
  const out: Record<string, BossInput> = {};
  if (!isObj(raw)) return out;
  for (const id of Object.keys(raw)) {
    // getBoss filters unknown ids — including `__proto__` / `constructor` — so no
    // prototype-pollution and no rows the engine can't resolve.
    if (!getBoss(id)) continue;
    out[id] = sanitizeInput(id, raw[id]);
  }
  return out;
}

function sanitizeRegion(raw: unknown): UserRegion {
  if (!isObj(raw)) return DEFAULT_REGION;
  return {
    label: isStr(raw.label) ? raw.label.slice(0, 80) : DEFAULT_REGION.label,
    ns: raw.ns === "N" || raw.ns === "S" ? raw.ns : DEFAULT_REGION.ns,
    ew: raw.ew === "E" || raw.ew === "W" ? raw.ew : DEFAULT_REGION.ew,
    continent:
      raw.continent === "americas" || raw.continent === "emea" || raw.continent === "apac"
        ? raw.continent
        : DEFAULT_REGION.continent,
  };
}

const CAL_METRICS: readonly CalibrationMetric[] = ["superMegaEnergy", "megaEnergy", "legendaryXl", "megaXl"];

function sanitizeSettings(raw: unknown): PlannerSettings {
  const s = isObj(raw) ? raw : {};
  const d = DEFAULT_SETTINGS;
  const dt = isObj(s.downtimeSecRange) ? s.downtimeSecRange : {};
  const calibration: Partial<Record<CalibrationMetric, number>> = {};
  if (isObj(s.calibration)) {
    for (const m of CAL_METRICS) {
      const v = s.calibration[m];
      if (typeof v === "number" && Number.isFinite(v)) calibration[m] = v;
    }
  }
  const rewardCase =
    s.rewardCase === "optimistic" || s.rewardCase === "expected" || s.rewardCase === "safe" ? s.rewardCase : d.rewardCase;
  return {
    lobbySize: num(s.lobbySize, d.lobbySize),
    partyPlay: bool(s.partyPlay, d.partyPlay),
    partySize: num(s.partySize, d.partySize),
    downtimeSecRange: { min: num(dt.min, d.downtimeSecRange.min), max: num(dt.max, d.downtimeSecRange.max) },
    // null = auto (follow lobby size); a number is clamped to the 15–120 range.
    lobbyWaitSec:
      typeof s.lobbyWaitSec === "number" && Number.isFinite(s.lobbyWaitSec)
        ? Math.max(15, Math.min(120, s.lobbyWaitSec))
        : null,
    rewardCase,
    freeDailyPerDay: num(s.freeDailyPerDay, d.freeDailyPerDay),
    useRemoteRaids: bool(s.useRemoteRaids, d.useRemoteRaids),
    remoteRaidPassesPlanned: nonNeg(s.remoteRaidPassesPlanned, d.remoteRaidPassesPlanned),
    region: sanitizeRegion(s.region),
    passesOwned: nonNeg(s.passesOwned, d.passesOwned),
    linkChargesOwned: nonNeg(s.linkChargesOwned, d.linkChargesOwned),
    useLinkCharges: bool(s.useLinkCharges, d.useLinkCharges),
    megaBuddyLevel: num(s.megaBuddyLevel, d.megaBuddyLevel),
    calibration,
  };
}

const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter(isStr) : []);

function numRecord(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (isObj(v))
    for (const [k, val] of Object.entries(v))
      if (k !== "__proto__" && typeof val === "number" && Number.isFinite(val)) out[k] = val;
  return out;
}
function boolRecord(v: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  if (isObj(v)) for (const [k, val] of Object.entries(v)) if (k !== "__proto__" && typeof val === "boolean") out[k] = val;
  return out;
}
function strArrayRecord(v: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (isObj(v)) for (const [k, val] of Object.entries(v)) if (k !== "__proto__") out[k] = strArray(val);
  return out;
}

/** Return a fully-coerced, safe-to-load copy of a backup. */
export function sanitizeBackup(b: StateBackup): StateBackup {
  return {
    ...b,
    inputs: sanitizeInputs(b.inputs),
    settings: sanitizeSettings(b.settings),
    research: boolRecord(b.research),
    blockPriority: strArrayRecord(b.blockPriority),
    globalPriority: strArray(b.globalPriority),
    individualPriority: strArray(b.individualPriority),
    quickCatchBlocks: boolRecord(b.quickCatchBlocks),
    remoteAllocations: numRecord(b.remoteAllocations),
    remoteAuto: bool(b.remoteAuto, false),
    raidsDone: numRecord(b.raidsDone),
    playDays: boolRecord(b.playDays),
    roadTargets: strArrayRecord(b.roadTargets),
    roadCoupled: bool(b.roadCoupled, true),
    roadSelected: boolRecord(b.roadSelected),
    roadEnergy: strArrayRecord(b.roadEnergy),
  };
}
