import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getBoss, SORTED_BOSSES, MEWTWO_X_ID, MEWTWO_Y_ID, HABITATS } from "@/data";
import { blockKey } from "@/data/habitats";
import { FORM_META } from "@/data/formGroups";
import { RESEARCH_LINES } from "@/data/research";
import { globalPriorityFromBlocks } from "@/domain/blockPlan";
import { bossIsLocal } from "@/domain/region";
import { PRESETS } from "@/data/presets";
import { makeDefaultInput } from "@/domain/defaults";
import { DEFAULT_SETTINGS, type PlannerSettings, type CalibrationMetric } from "@/domain/settings";
import type { BossInput, Variant, PokemonCopy, EnergyProgress } from "@/domain/types";
import type { ScanResult } from "@/lib/screenshotScan";
import { idbGet, idbSet } from "@/lib/idbStore";
import type { StateBackup } from "./stateBackup";

export { makeDefaultInput };

type CurrentField = keyof BossInput["current"];

/** Flat patch for one individual copy (maps onto its nested current/target).
 *  The `*Y` fields are Mewtwo's independent Y mega branch. */
export type CopyPatch = Partial<{
  variant: Variant;
  lucky: boolean;
  maxMoves: boolean;
  level: number;
  megaLevel: number;
  megaLevelY: number;
  targetLevel: number;
  targetMegaLevel: number;
  targetMegaLevelY: number;
}>;

const cid = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Seed copy #1 from the card's single current/target/variant fields. */
const copyFromInput = (input: BossInput): PokemonCopy => ({
  id: cid(),
  variant: input.variant ?? "standard",
  current: { level: input.current.level, megaLevel: input.current.megaLevel },
  target: { level: input.target.level, megaLevel: input.target.megaLevel },
});

/** A fresh individual to add (its goal defaults to the boss's current target). */
const newCopy = (input: BossInput): PokemonCopy => ({
  id: cid(),
  variant: "standard",
  current: { level: 40, megaLevel: 0 },
  target: { level: input.target.level, megaLevel: input.target.megaLevel },
});

const applyCopyPatch = (c: PokemonCopy, p: CopyPatch): PokemonCopy => ({
  ...c,
  variant: p.variant ?? c.variant,
  lucky: p.lucky ?? c.lucky,
  // Booleans toggle both ways, so honour an explicit `false` (?? would ignore it).
  maxMoves: p.maxMoves === undefined ? c.maxMoves : p.maxMoves,
  current: {
    level: p.level ?? c.current.level,
    megaLevel: p.megaLevel ?? c.current.megaLevel,
    megaLevelY: p.megaLevelY ?? c.current.megaLevelY,
  },
  target: {
    level: p.targetLevel ?? c.target.level,
    megaLevel: p.targetMegaLevel ?? c.target.megaLevel,
    megaLevelY: p.targetMegaLevelY ?? c.target.megaLevelY,
  },
});

// ---- Mewtwo individuals: one Mewtwo with independent X (megaLevel) and Y
// (megaLevelY) branches. Copies live on the selected "owner" form's input. ----
const mewtwoOwnerId = (inputs: Record<string, BossInput>): string | null =>
  inputs[MEWTWO_X_ID]?.selected ? MEWTWO_X_ID : inputs[MEWTWO_Y_ID]?.selected ? MEWTWO_Y_ID : null;

const mewtwoSeedCopy = (xi: BossInput | undefined, yi: BossInput | undefined, owner: BossInput): PokemonCopy => ({
  id: cid(),
  variant: owner.variant ?? "standard",
  current: { level: owner.current.level, megaLevel: xi?.current.megaLevel ?? 0, megaLevelY: yi?.current.megaLevel ?? 0 },
  target: { level: owner.target.level, megaLevel: xi?.target.megaLevel ?? 4, megaLevelY: yi?.target.megaLevel ?? 4 },
});

const newMewtwoCopy = (owner: BossInput): PokemonCopy => ({
  id: cid(),
  variant: "standard",
  current: { level: 40, megaLevel: 0, megaLevelY: 0 },
  target: { level: owner.target.level, megaLevel: 4, megaLevelY: 4 },
});

/** Boss ids sharing a form group with this one (incl. itself), else just it. */
function formFamilyIds(bossId: string): string[] {
  const meta = FORM_META.get(bossId);
  return meta ? [bossId, ...meta.siblings] : [bossId];
}

/**
 * Set `selected` on a boss AND its shared-resource formes, so a multi-form
 * species (Giratina, Dialga, …) toggles as one unit while both formes still show
 * in the selection list. Non-grouped bosses are unaffected.
 */
function selectFamily(
  inputs: Record<string, BossInput>,
  bossId: string,
  selected: boolean,
): Record<string, BossInput> {
  const next = { ...inputs };
  for (const id of formFamilyIds(bossId)) {
    const boss = getBoss(id);
    if (!boss) continue;
    const existing = next[id];
    next[id] = existing ? { ...existing, selected } : { ...makeDefaultInput(boss), selected };
  }
  return next;
}

/** Max persisted screenshot previews (data URLs) before evicting the oldest. */
const MAX_SCREENSHOTS = 12;

/**
 * Debounced, quota-tolerant localStorage. Store updates fire on every
 * keystroke; this batches rapid writes into one (300ms trailing, flushed on tab
 * hide) and swallows QuotaExceededError so a full disk / private mode can never
 * crash a state update. localStorage persists the plan per-device across
 * sessions — closing Safari / the tab and reopening days later keeps every
 * input (cleared only when the user clears site data). A no-op on the server.
 */
function makeSafeStorage() {
  const noop = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  if (typeof window === "undefined") return noop;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let queued: { key: string; value: string } | null = null;
  const flush = () => {
    if (!queued) return;
    try {
      window.localStorage.setItem(queued.key, queued.value);
    } catch {
      /* quota exceeded / private mode — drop the write rather than throw */
    }
    queued = null;
    timer = null;
  };
  window.addEventListener("pagehide", flush);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  return {
    getItem: (name: string) => {
      if (queued && queued.key === name) return queued.value; // freshest pending value
      try {
        return window.localStorage.getItem(name);
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      queued = { key: name, value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, 300);
    },
    removeItem: (name: string) => {
      queued = null;
      if (timer) clearTimeout(timer);
      try {
        window.localStorage.removeItem(name);
      } catch {
        /* ignore */
      }
    },
  };
}

/** A persisted screenshot preview, keyed by species (e.g. "mewtwo"). */
export interface ScreenshotPreview {
  src: string;
  capturedAt: number;
}

/** Max imported screenshots retained (in-memory list) before evicting oldest —
 *  generous so a full-roster upload session is never truncated. The whole list
 *  (with thumbnails) persists to IndexedDB, which has ample quota. */
const MAX_IMPORTS = 100;

// Heavy, rarely-read blobs (screenshot previews + the OCR import grid) persist
// to IndexedDB instead of the synchronous localStorage plan-state, so plan
// writes stay tiny/instant and the screenshots get IDB's larger quota.
const IDB_SCREENSHOTS = "screenshots";
const IDB_IMPORTS = "imports";

/**
 * One uploaded-and-scanned screenshot, persisted so the import grid + its
 * resource pulls survive a refresh without re-running OCR. `key` is the species
 * the user assigned (or that we auto-detected), "" when unassigned.
 */
export interface ImportedShot {
  id: string;
  fileName: string;
  thumb: string | null;
  scan: ScanResult;
  key: string;
  error?: string;
}

interface PlannerState {
  inputs: Record<string, BossInput>;
  settings: PlannerSettings;
  /** Which research lines the user has (or will) complete, by id. */
  research: Record<string, boolean>;
  /** Imported screenshot previews, keyed by species — only the latest is kept. */
  screenshots: Record<string, ScreenshotPreview>;
  /** Uploaded-and-scanned screenshots (the import grid + resource pulls). */
  imports: ImportedShot[];
  /** Raids the user has already completed, keyed by `${bossId}@${day}${hour}`. */
  raidsDone: Record<string, number>;
  /** Remote raids the user assigns to each species, keyed by bossId (sum ≤ 60). */
  remoteAllocations: Record<string, number>;
  /**
   * When true, remote allocations are auto-balanced by priority (and re-balance
   * whenever priority/goals change). Off by default and when opting into remote
   * raids, so allocations start at 0 for the user to assign; editing any single
   * allocation keeps it off, and "Auto-balance" opts in.
   */
  remoteAuto: boolean;
  /**
   * Per-block priority, keyed by block (e.g. "sat0") → ordered boss ids (highest
   * first). Drives each block's fill / cut order and which species' raids fall
   * short when that block is over capacity. Ids absent sort after, in roster order.
   */
  blockPriority: Record<string, string[]>;
  /**
   * A single, canonical priority order over ALL selected targets (highest
   * first), set on the "Prioritize" step. Reordering it seeds every habitat
   * block's `blockPriority`, so one ranking drives the whole plan; the results
   * view can still override an individual block's order on top of this.
   */
  globalPriority: string[];
  /**
   * The flat "one row per individual" rank on the Prioritize step (highest
   * first), keyed by `${bossId}::${copyId}` (or `${bossId}::single`). This lets
   * a species' individuals INTERLEAVE with other species — e.g. three Mewtwo
   * goals at ranks 2, 8 and 13 — instead of being forced together. The engine's
   * species order (globalPriority) and each species' copy order are derived from
   * it (species rank = its highest-placed individual). Empty = fall back to the
   * species order. Only the flat view writes it.
   */
  individualPriority: string[];
  /**
   * Per species, per time block: `${bossId}@${blockKey}` → true means quick-catch
   * those raids (saves time but forfeits catch Candy/XL — only completion rewards
   * like Mega Energy / Rare Candy). Absent = off (normal catch). Off by default.
   */
  quickCatchBlocks: Record<string, boolean>;
  /**
   * Which Road of Legends weekdays (Mon Jul 6 → Fri Jul 10) the player intends
   * to raid, keyed by day id ("mon".."fri"). Those days' raid-hour throughput is
   * a head start that reduces the weekend demand. Absent/false = not playing.
   */
  playDays: Record<string, boolean>;
  toggleSelected: (bossId: string) => void;
  setSelected: (bossId: string, selected: boolean) => void;
  /** Select every roster boss at once. */
  selectAll: () => void;
  setCount: (bossId: string, variant: Variant, value: number) => void;
  setQuantity: (bossId: string, value: number) => void;
  setVariant: (bossId: string, variant: Variant) => void;
  /** Multi-copy maxing: distinct individuals of one species, in priority order. */
  addCopy: (bossId: string) => void;
  /** Seed individual #1 from the single fields when a card has no copies yet. */
  ensureCopies: (bossId: string) => void;
  removeCopy: (bossId: string, copyId: string) => void;
  updateCopy: (bossId: string, copyId: string, patch: CopyPatch) => void;
  moveCopy: (bossId: string, copyId: string, dir: -1 | 1) => void;
  /** Set a species' individuals to an explicit order (drag-to-rank). */
  reorderCopies: (bossId: string, copyIds: string[]) => void;
  /** Mewtwo individuals (independent X/Y branches), stored on the owner form. */
  addMewtwoCopy: () => void;
  /** Seed Mewtwo individual #1 so the always-on maxing editor has a row. */
  ensureMewtwoCopies: () => void;
  removeMewtwoCopy: (copyId: string) => void;
  updateMewtwoCopy: (copyId: string, patch: CopyPatch) => void;
  moveMewtwoCopy: (copyId: string, dir: -1 | 1) => void;
  /** Set one block's priority order (highest first). */
  setBlockPriority: (blockKey: string, ids: string[]) => void;
  /** Set the single global priority order; seeds every block's order. */
  setGlobalPriority: (ids: string[]) => void;
  /** Set the flat per-individual rank (drag-to-rank on the Prioritize step). */
  setIndividualPriority: (keys: string[]) => void;
  /** Toggle quick-catch for a species in a given block (forfeits catch Candy/XL). */
  toggleQuickCatch: (bossId: string, blockKey: string) => void;
  /** Toggle whether the player will raid a given Road of Legends weekday. */
  togglePlayDay: (dayId: string) => void;
  /** Record how many raids the user has completed toward a per-block target. */
  setRaidsDone: (key: string, value: number) => void;
  /** Assign remote raids to a species (caps applied by the caller). Switches off auto-balance. */
  setRemoteAllocation: (bossId: string, value: number) => void;
  /** Replace the whole remote-allocation map (auto-balance writer — leaves the auto flag intact). */
  setRemoteAllocations: (map: Record<string, number>) => void;
  /** Turn priority-driven auto-balancing of remote allocations on/off. */
  setRemoteAuto: (on: boolean) => void;
  setCurrent: (bossId: string, field: CurrentField, value: number) => void;
  setTargetLevel: (bossId: string, level: number) => void;
  setTargetMegaLevel: (bossId: string, megaLevel: number) => void;
  setMegaBuddy: (bossId: string, on: boolean) => void;
  setL4Buddy: (bossId: string, on: boolean) => void;
  /** Update one fusion/crowned/primal energy goal's progress (have / goal / on). */
  setEnergy: (bossId: string, key: string, patch: Partial<EnergyProgress>) => void;
  setResearchEnabled: (id: string, enabled: boolean, exclusiveWith?: readonly string[]) => void;
  /** Store a screenshot preview for a species — keeps only the most-recent. */
  setScreenshot: (speciesKey: string, src: string, capturedAt: number) => void;
  /** Append freshly-scanned screenshots to the import grid (capped, oldest evicted). */
  addImports: (shots: ImportedShot[]) => void;
  /** Remove one imported screenshot (and thus its resource pull) by id. */
  removeImport: (id: string) => void;
  /** Reassign the species an imported screenshot maps to. */
  setImportKey: (id: string, key: string) => void;
  /** Drop every imported screenshot. */
  clearImports: () => void;
  applyPreset: (bossId: string, presetId: string) => void;
  setSettings: (patch: Partial<PlannerSettings>) => void;
  /** Log (or clear, with 0) an observed per-raid reward to calibrate the plan. */
  setCalibration: (metric: CalibrationMetric, value: number) => void;
  resetSettings: () => void;
  resetAll: () => void;
  /** Replace the planning state from an imported backup (.json or .xlsx). */
  loadState: (backup: StateBackup) => void;
}

// Remote passes are unlimited in count (GO Fest 2026), so there's no per-species
// cap — just clamp to a non-negative integer. The time-based feasibility (how
// many remote raids fit in the user's waking hours) is surfaced in the UI.
function clampRemote(value: number): number {
  return Math.max(0, Number.isFinite(value) ? Math.round(value) : 0);
}

function ensureInput(state: PlannerState, bossId: string): BossInput | null {
  const existing = state.inputs[bossId];
  if (existing) return existing;
  const boss = getBoss(bossId);
  return boss ? makeDefaultInput(boss) : null;
}

/**
 * One block's selected members (fixed-window bosses in that block + the eligible
 * Mewtwo form) in effective priority order — the block's explicit order first,
 * then any unranked members in roster order. Shared by the block UI's drag list
 * and the plan so both agree.
 */
export function blockMembersInOrder(memberIds: string[], order: string[]): string[] {
  const rank = new Map(order.map((id, i) => [id, i] as const));
  const roster = new Map(SORTED_BOSSES.map((b, i) => [b.id, i] as const));
  return [...memberIds].sort(
    (a, b) =>
      (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity) ||
      (roster.get(a) ?? Infinity) - (roster.get(b) ?? Infinity),
  );
}

/**
 * Selected bosses in a single global priority order — derived from the per-block
 * lists (chronological blocks, each block's ranking), then any unranked selected
 * bosses in roster order. Used by the event-wide remote pool + goal display.
 */
export function selectedInGlobalOrder(state: {
  inputs: Record<string, BossInput>;
  blockPriority: Record<string, string[]>;
}): string[] {
  const rank = new Map(globalPriorityFromBlocks(state.blockPriority).map((id, i) => [id, i] as const));
  return SORTED_BOSSES.filter((b) => {
    if (!state.inputs[b.id]?.selected) return false;
    const m = FORM_META.get(b.id);
    return !m || m.primary; // collapse a multi-form species to its primary forme
  })
    .map((b) => b.id)
    .sort((a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity));
}

/**
 * Selected targets (one row per shared-resource species) ordered by the
 * canonical `globalPriority`, with any not-yet-ranked selections appended in
 * roster order. Drives the global priority list on the Prioritize step.
 */
export function selectedInPriorityOrder(state: {
  inputs: Record<string, BossInput>;
  globalPriority: string[];
}): string[] {
  const rank = new Map(state.globalPriority.map((id, i) => [id, i] as const));
  return SORTED_BOSSES.filter((b) => {
    if (!state.inputs[b.id]?.selected) return false;
    const m = FORM_META.get(b.id);
    return !m || m.primary; // collapse a multi-form species to its primary forme
  })
    .map((b) => b.id)
    .sort(
      (a, b) =>
        (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity) ||
        (getBoss(a)?.sortPriority ?? 0) - (getBoss(b)?.sortPriority ?? 0),
    );
}

// Every GO Fest research line counts toward goals by default (both on).
const DEFAULT_RESEARCH: Record<string, boolean> = Object.fromEntries(RESEARCH_LINES.map((l) => [l.id, true]));

// Mega Mewtwo X & Y are the event headliners everyone hunts, so a fresh plan
// starts with both pre-selected. A returning user's persisted selection wins.
function seededInputs(): Record<string, BossInput> {
  const out: Record<string, BossInput> = {};
  for (const id of [MEWTWO_X_ID, MEWTWO_Y_ID]) {
    const boss = getBoss(id);
    if (boss) out[id] = makeDefaultInput(boss);
  }
  return out;
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set) => ({
      inputs: seededInputs(),
      settings: { ...DEFAULT_SETTINGS },
      research: { ...DEFAULT_RESEARCH },
      screenshots: {},
      imports: [],
      raidsDone: {},
      remoteAllocations: {},
      remoteAuto: false,
      blockPriority: {},
      globalPriority: [],
      individualPriority: [],
      quickCatchBlocks: {},
      playDays: {},

      togglePlayDay: (dayId) =>
        set((state) => ({ playDays: { ...state.playDays, [dayId]: !state.playDays[dayId] } })),

      setRaidsDone: (key, value) =>
        set((state) => {
          const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
          return { raidsDone: { ...state.raidsDone, [key]: safe } };
        }),

      setRemoteAllocation: (bossId, value) =>
        set((state) => {
          // A manual edit takes over from auto-balance so the user's tweaks stick.
          return { remoteAllocations: { ...state.remoteAllocations, [bossId]: clampRemote(value) }, remoteAuto: false };
        }),

      setRemoteAllocations: (map) =>
        set(() => {
          const clamped: Record<string, number> = {};
          for (const id in map) clamped[id] = clampRemote(map[id]);
          return { remoteAllocations: clamped };
        }),

      setRemoteAuto: (on) => set({ remoteAuto: on }),

      addImports: (shots) =>
        set((state) => {
          const imports = [...state.imports, ...shots];
          // Retain a generous in-memory history; evict only the very oldest past
          // MAX_IMPORTS. Persisted size is bounded separately (partialize trims
          // older thumbnails), so the list isn't capped by the storage quota.
          return { imports: imports.slice(Math.max(0, imports.length - MAX_IMPORTS)) };
        }),

      removeImport: (id) =>
        set((state) => ({ imports: state.imports.filter((s) => s.id !== id) })),

      setImportKey: (id, key) =>
        set((state) => ({ imports: state.imports.map((s) => (s.id === id ? { ...s, key } : s)) })),

      clearImports: () => set({ imports: [] }),

      setScreenshot: (speciesKey, src, capturedAt) =>
        set((state) => {
          const prev = state.screenshots[speciesKey];
          // Same species → keep only the most-recent screenshot (drop predecessors).
          if (prev && prev.capturedAt > capturedAt) return state;
          const screenshots = { ...state.screenshots, [speciesKey]: { src, capturedAt } };
          // Cap the persisted previews so data-URL bloat can't blow the
          // localStorage quota — evict the oldest beyond MAX_SCREENSHOTS.
          const keys = Object.keys(screenshots);
          if (keys.length > MAX_SCREENSHOTS) {
            keys
              .sort((a, b) => screenshots[a].capturedAt - screenshots[b].capturedAt)
              .slice(0, keys.length - MAX_SCREENSHOTS)
              .forEach((k) => delete screenshots[k]);
          }
          return { screenshots };
        }),

      setResearchEnabled: (id, enabled, exclusiveWith) =>
        set((state) => {
          const research = { ...state.research, [id]: enabled };
          // Branching research: enabling one branch clears the others.
          if (enabled && exclusiveWith) {
            for (const other of exclusiveWith) if (other !== id) research[other] = false;
          }
          return { research };
        }),

      toggleSelected: (bossId) =>
        set((state) => {
          const boss = getBoss(bossId);
          if (!boss) return state;
          const next = !(state.inputs[bossId]?.selected ?? false);
          const inputs = selectFamily(state.inputs, bossId, next);
          // Selecting a target that's remote-only in the user's region flips on
          // step 3's "do remote raids" toggle automatically.
          return next && !state.settings.useRemoteRaids && !bossIsLocal(boss, state.settings.region)
            ? { inputs, settings: { ...state.settings, useRemoteRaids: true } }
            : { inputs };
        }),

      setSelected: (bossId, selected) =>
        set((state) => {
          const boss = getBoss(bossId);
          if (!boss) return state;
          const inputs = selectFamily(state.inputs, bossId, selected);
          return selected && !state.settings.useRemoteRaids && !bossIsLocal(boss, state.settings.region)
            ? { inputs, settings: { ...state.settings, useRemoteRaids: true } }
            : { inputs };
        }),

      selectAll: () =>
        set((state) => {
          const inputs = { ...state.inputs };
          for (const boss of SORTED_BOSSES) {
            const existing = inputs[boss.id];
            inputs[boss.id] = existing
              ? { ...existing, selected: true }
              : { ...makeDefaultInput(boss), selected: true };
          }
          const anyRemote = SORTED_BOSSES.some((b) => !bossIsLocal(b, state.settings.region));
          return anyRemote && !state.settings.useRemoteRaids
            ? { inputs, settings: { ...state.settings, useRemoteRaids: true } }
            : { inputs };
        }),

      setCount: (bossId, variant, value) =>
        set((state) => {
          const input = ensureInput(state, bossId);
          if (!input) return state;
          const counts = input.counts ?? { standard: 1, shadow: 0, purified: 0 };
          const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
          return {
            inputs: { ...state.inputs, [bossId]: { ...input, counts: { ...counts, [variant]: safe } } },
          };
        }),

      setQuantity: (bossId, value) =>
        set((state) => {
          const input = ensureInput(state, bossId);
          if (!input) return state;
          const safe = Number.isFinite(value) ? Math.max(1, Math.round(value)) : 1;
          return { inputs: { ...state.inputs, [bossId]: { ...input, quantity: safe } } };
        }),

      setVariant: (bossId, variant) =>
        set((state) => {
          const input = ensureInput(state, bossId);
          if (!input) return state;
          return { inputs: { ...state.inputs, [bossId]: { ...input, variant } } };
        }),

      addCopy: (bossId) =>
        set((state) => {
          const input = ensureInput(state, bossId);
          if (!input) return state;
          // First add seeds copy #1 from the single fields, then appends a new one.
          const copies = input.copies && input.copies.length ? input.copies : [copyFromInput(input)];
          return { inputs: { ...state.inputs, [bossId]: { ...input, copies: [...copies, newCopy(input)] } } };
        }),

      // Seed copy #1 from the single fields if a card has no copies yet — the
      // input cards always show the per-individual "maxing" editor, so there's
      // always at least one individual to edit.
      ensureCopies: (bossId) =>
        set((state) => {
          const input = state.inputs[bossId];
          if (!input || (input.copies && input.copies.length)) return state;
          return { inputs: { ...state.inputs, [bossId]: { ...input, copies: [copyFromInput(input)] } } };
        }),

      removeCopy: (bossId, copyId) =>
        set((state) => {
          const input = state.inputs[bossId];
          if (!input?.copies) return state;
          const copies = input.copies.filter((c) => c.id !== copyId);
          // Dropping to a single individual collapses back to the simple card,
          // restoring the survivor's level/variant into the single fields.
          if (copies.length <= 1) {
            const c = copies[0];
            const next: BossInput = c
              ? {
                  ...input,
                  copies: undefined,
                  variant: c.variant,
                  current: { ...input.current, level: c.current.level, megaLevel: c.current.megaLevel },
                  target: { level: c.target.level, megaLevel: c.target.megaLevel },
                }
              : { ...input, copies: undefined };
            return { inputs: { ...state.inputs, [bossId]: next } };
          }
          return { inputs: { ...state.inputs, [bossId]: { ...input, copies } } };
        }),

      updateCopy: (bossId, copyId, patch) =>
        set((state) => {
          const input = state.inputs[bossId];
          if (!input?.copies) return state;
          const copies = input.copies.map((c) => (c.id === copyId ? applyCopyPatch(c, patch) : c));
          return { inputs: { ...state.inputs, [bossId]: { ...input, copies } } };
        }),

      moveCopy: (bossId, copyId, dir) =>
        set((state) => {
          const input = state.inputs[bossId];
          if (!input?.copies) return state;
          const copies = [...input.copies];
          const idx = copies.findIndex((c) => c.id === copyId);
          const to = idx + dir;
          if (idx < 0 || to < 0 || to >= copies.length) return state;
          [copies[idx], copies[to]] = [copies[to], copies[idx]];
          return { inputs: { ...state.inputs, [bossId]: { ...input, copies } } };
        }),

      reorderCopies: (bossId, copyIds) =>
        set((state) => {
          const input = state.inputs[bossId];
          if (!input?.copies) return state;
          const byId = new Map(input.copies.map((c) => [c.id, c] as const));
          // Reorder by the given ids; keep any copy the list omits (defensive) at the end.
          const reordered = [
            ...copyIds.map((id) => byId.get(id)).filter((c): c is NonNullable<typeof c> => !!c),
            ...input.copies.filter((c) => !copyIds.includes(c.id)),
          ];
          return { inputs: { ...state.inputs, [bossId]: { ...input, copies: reordered } } };
        }),

      addMewtwoCopy: () =>
        set((state) => {
          const ownerId = mewtwoOwnerId(state.inputs);
          if (!ownerId) return state;
          const owner = state.inputs[ownerId]!;
          const xi = state.inputs[MEWTWO_X_ID];
          const yi = state.inputs[MEWTWO_Y_ID];
          const copies = owner.copies?.length ? owner.copies : [mewtwoSeedCopy(xi, yi, owner)];
          return { inputs: { ...state.inputs, [ownerId]: { ...owner, copies: [...copies, newMewtwoCopy(owner)] } } };
        }),

      // Seed Mewtwo individual #1 so the always-on maxing editor has a row.
      ensureMewtwoCopies: () =>
        set((state) => {
          const ownerId = mewtwoOwnerId(state.inputs);
          if (!ownerId) return state;
          const owner = state.inputs[ownerId]!;
          if (owner.copies && owner.copies.length) return state;
          const copies = [mewtwoSeedCopy(state.inputs[MEWTWO_X_ID], state.inputs[MEWTWO_Y_ID], owner)];
          return { inputs: { ...state.inputs, [ownerId]: { ...owner, copies } } };
        }),

      updateMewtwoCopy: (copyId, patch) =>
        set((state) => {
          const ownerId = mewtwoOwnerId(state.inputs);
          const owner = ownerId ? state.inputs[ownerId] : undefined;
          if (!ownerId || !owner?.copies) return state;
          const copies = owner.copies.map((c) => (c.id === copyId ? applyCopyPatch(c, patch) : c));
          return { inputs: { ...state.inputs, [ownerId]: { ...owner, copies } } };
        }),

      moveMewtwoCopy: (copyId, dir) =>
        set((state) => {
          const ownerId = mewtwoOwnerId(state.inputs);
          const owner = ownerId ? state.inputs[ownerId] : undefined;
          if (!ownerId || !owner?.copies) return state;
          const copies = [...owner.copies];
          const idx = copies.findIndex((c) => c.id === copyId);
          const to = idx + dir;
          if (idx < 0 || to < 0 || to >= copies.length) return state;
          [copies[idx], copies[to]] = [copies[to], copies[idx]];
          return { inputs: { ...state.inputs, [ownerId]: { ...owner, copies } } };
        }),

      removeMewtwoCopy: (copyId) =>
        set((state) => {
          const ownerId = mewtwoOwnerId(state.inputs);
          const owner = ownerId ? state.inputs[ownerId] : undefined;
          if (!ownerId || !owner?.copies) return state;
          const copies = owner.copies.filter((c) => c.id !== copyId);
          if (copies.length > 1) {
            return { inputs: { ...state.inputs, [ownerId]: { ...owner, copies } } };
          }
          // Collapse to the simple Mewtwo card, restoring the survivor's level
          // into the owner and its X / Y mega levels into the two form inputs.
          const c = copies[0];
          const inputs = { ...state.inputs };
          inputs[ownerId] = c
            ? {
                ...owner,
                copies: undefined,
                variant: c.variant,
                current: { ...owner.current, level: c.current.level },
                target: { ...owner.target, level: c.target.level },
              }
            : { ...owner, copies: undefined };
          if (c) {
            const xi = inputs[MEWTWO_X_ID];
            const yi = inputs[MEWTWO_Y_ID];
            if (xi)
              inputs[MEWTWO_X_ID] = {
                ...xi,
                current: { ...xi.current, megaLevel: c.current.megaLevel },
                target: { ...xi.target, megaLevel: c.target.megaLevel },
              };
            if (yi)
              inputs[MEWTWO_Y_ID] = {
                ...yi,
                current: { ...yi.current, megaLevel: c.current.megaLevelY ?? 0 },
                target: { ...yi.target, megaLevel: c.target.megaLevelY ?? 4 },
              };
          }
          return { inputs };
        }),

      setBlockPriority: (blockKey, ids) =>
        set((state) => ({ blockPriority: { ...state.blockPriority, [blockKey]: ids } })),

      setGlobalPriority: (ids) =>
        set((state) => {
          // One ranking drives every block: write the full ordered id list into
          // each habitat block's priority. A block only ranks the ids it
          // actually contains (the rest are ignored), so the same list works
          // for all six blocks; a later per-block drag overrides just that block.
          const blockPriority = { ...state.blockPriority };
          for (const h of HABITATS) blockPriority[blockKey(h.day, h.startHour)] = ids;
          return { globalPriority: ids, blockPriority };
        }),

      setIndividualPriority: (keys) => set({ individualPriority: keys }),

      toggleQuickCatch: (bossId, blockKey) =>
        set((state) => {
          const key = `${bossId}@${blockKey}`;
          return { quickCatchBlocks: { ...state.quickCatchBlocks, [key]: !state.quickCatchBlocks[key] } };
        }),

      setCurrent: (bossId, field, value) =>
        set((state) => {
          const input = ensureInput(state, bossId);
          if (!input) return state;
          const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
          return {
            inputs: {
              ...state.inputs,
              [bossId]: { ...input, current: { ...input.current, [field]: safe } },
            },
          };
        }),

      setTargetLevel: (bossId, level) =>
        set((state) => {
          const input = ensureInput(state, bossId);
          if (!input) return state;
          return {
            inputs: {
              ...state.inputs,
              [bossId]: { ...input, presetId: undefined, target: { ...input.target, level } },
            },
          };
        }),

      setTargetMegaLevel: (bossId, megaLevel) =>
        set((state) => {
          const input = ensureInput(state, bossId);
          if (!input) return state;
          return {
            inputs: {
              ...state.inputs,
              [bossId]: { ...input, presetId: undefined, target: { ...input.target, megaLevel } },
            },
          };
        }),

      setMegaBuddy: (bossId, on) =>
        set((state) => {
          const input = ensureInput(state, bossId);
          if (!input) return state;
          return { inputs: { ...state.inputs, [bossId]: { ...input, megaBuddy: on } } };
        }),

      setL4Buddy: (bossId, on) =>
        set((state) => {
          const input = ensureInput(state, bossId);
          if (!input) return state;
          return { inputs: { ...state.inputs, [bossId]: { ...input, l4Buddy: on } } };
        }),

      setEnergy: (bossId, key, patch) =>
        set((state) => {
          const input = ensureInput(state, bossId);
          if (!input) return state;
          const cur = input.energy?.[key] ?? { have: 0, goal: 0, on: false };
          const clampN = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);
          const next: EnergyProgress = {
            have: patch.have !== undefined ? clampN(patch.have) : cur.have,
            goal: patch.goal !== undefined ? clampN(patch.goal) : cur.goal,
            on: patch.on !== undefined ? patch.on : cur.on,
          };
          return {
            inputs: { ...state.inputs, [bossId]: { ...input, energy: { ...input.energy, [key]: next } } },
          };
        }),

      applyPreset: (bossId, presetId) =>
        set((state) => {
          const input = ensureInput(state, bossId);
          const preset = PRESETS.find((p) => p.id === presetId);
          if (!input || !preset) return state;
          return {
            inputs: {
              ...state.inputs,
              [bossId]: {
                ...input,
                presetId,
                target: {
                  level: preset.target.level ?? input.target.level,
                  megaLevel: preset.target.megaLevel ?? input.target.megaLevel,
                },
              },
            },
          };
        }),

      setSettings: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...patch,
            downtimeSecRange: { ...state.settings.downtimeSecRange, ...patch.downtimeSecRange },
          },
        })),

      setCalibration: (metric, value) =>
        set((state) => {
          const calibration = { ...state.settings.calibration };
          if (value && value > 0) calibration[metric] = Math.round(value);
          else delete calibration[metric];
          return { settings: { ...state.settings, calibration } };
        }),

      resetSettings: () => set({ settings: { ...DEFAULT_SETTINGS } }),

      resetAll: () =>
        set({
          inputs: seededInputs(),
          settings: { ...DEFAULT_SETTINGS },
          research: { ...DEFAULT_RESEARCH },
          screenshots: {},
          imports: [],
          raidsDone: {},
          remoteAllocations: {},
          remoteAuto: false,
          blockPriority: {},
          globalPriority: [],
          individualPriority: [],
          quickCatchBlocks: {},
          playDays: {},
        }),

      loadState: (b) =>
        set({
          // Replace the planning state from an imported backup. Settings merge
          // under DEFAULT_SETTINGS so a backup from an older version still picks
          // up newly-added knobs. Screenshots/imports are left untouched.
          inputs: b.inputs ?? {},
          settings: { ...DEFAULT_SETTINGS, ...(b.settings ?? {}) },
          research: b.research && Object.keys(b.research).length ? b.research : { ...DEFAULT_RESEARCH },
          blockPriority: b.blockPriority ?? {},
          globalPriority: b.globalPriority ?? [],
          individualPriority: b.individualPriority ?? [],
          quickCatchBlocks: b.quickCatchBlocks ?? {},
          remoteAllocations: b.remoteAllocations ?? {},
          remoteAuto: typeof b.remoteAuto === "boolean" ? b.remoteAuto : false,
          raidsDone: b.raidsDone ?? {},
          playDays: b.playDays ?? {},
        }),
    }),
    {
      name: "gofest26-planner-v1",
      version: 20, // +rareCandy holdings (backfilled via DEFAULT_SETTINGS)
      storage: createJSONStorage(makeSafeStorage),
      // Keep the heavy screenshot blobs OUT of the synchronous localStorage
      // plan-state — they persist to IndexedDB (see initScreenshotPersistence),
      // so plan writes stay tiny and instant.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      partialize: ({ screenshots, imports, ...rest }) => rest,
      migrate: (persisted) => {
        // Backfill defaults and guard against missing/corrupted fields so the
        // store always has a valid shape. Merging DEFAULT_SETTINGS under any
        // persisted settings picks up newly-added knobs (lobby size, party play).
        const state = (persisted ?? {}) as Partial<PlannerState>;
        if (!state.inputs) state.inputs = {};
        // Default GO Fest research on (both lines) when the user hasn't set any.
        if (!state.research || Object.keys(state.research).length === 0) state.research = { ...DEFAULT_RESEARCH };
        if (!state.screenshots) state.screenshots = {};
        if (!Array.isArray(state.imports)) state.imports = [];
        if (!state.blockPriority || typeof state.blockPriority !== "object") state.blockPriority = {};
        if (!Array.isArray(state.globalPriority)) state.globalPriority = [];
        if (!Array.isArray(state.individualPriority)) state.individualPriority = [];
        if (!state.quickCatchBlocks || typeof state.quickCatchBlocks !== "object") state.quickCatchBlocks = {};
        if (!state.raidsDone || typeof state.raidsDone !== "object") state.raidsDone = {};
        if (!state.remoteAllocations || typeof state.remoteAllocations !== "object") state.remoteAllocations = {};
        if (typeof state.remoteAuto !== "boolean") state.remoteAuto = false;
        if (!state.playDays || typeof state.playDays !== "object") state.playDays = {};
        state.settings = { ...DEFAULT_SETTINGS, ...(state.settings ?? {}) };
        return state as PlannerState;
      },
    },
  ),
);

/**
 * Hydrate screenshots + imports from IndexedDB on the client, then write them
 * back (debounced) whenever they change. Runs once. If IDB already holds them
 * they're authoritative; otherwise we migrate whatever the (pre-v16 localStorage)
 * blob loaded into the store. Failures are swallowed — screenshots simply won't
 * persist, which never blocks the plan.
 */
function initScreenshotPersistence() {
  void (async () => {
    const [scr, imp] = await Promise.all([
      idbGet<Record<string, ScreenshotPreview>>(IDB_SCREENSHOTS),
      idbGet<ImportedShot[]>(IDB_IMPORTS),
    ]);
    const st = usePlannerStore.getState();
    if (scr || imp) {
      usePlannerStore.setState({ screenshots: scr ?? st.screenshots, imports: imp ?? st.imports });
    } else if (Object.keys(st.screenshots).length || st.imports.length) {
      // First run after the IndexedDB switch — migrate the old localStorage blob.
      void idbSet(IDB_SCREENSHOTS, st.screenshots);
      void idbSet(IDB_IMPORTS, st.imports);
    }
  })();

  let timer: ReturnType<typeof setTimeout> | null = null;
  usePlannerStore.subscribe((state, prev) => {
    if (state.screenshots === prev.screenshots && state.imports === prev.imports) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      const s = usePlannerStore.getState();
      void idbSet(IDB_SCREENSHOTS, s.screenshots);
      void idbSet(IDB_IMPORTS, s.imports);
    }, 400);
  });
}

if (typeof window !== "undefined") initScreenshotPersistence();
