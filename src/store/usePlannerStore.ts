import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getBoss, SORTED_BOSSES, MEWTWO_X_ID, MEWTWO_Y_ID } from "@/data";
import { PRESETS } from "@/data/presets";
import { makeDefaultInput } from "@/domain/defaults";
import { DEFAULT_SETTINGS, MAX_REMOTE_PER_SPECIES, type PlannerSettings } from "@/domain/settings";
import type { BossInput, Variant } from "@/domain/types";
import type { ScanResult } from "@/lib/screenshotScan";

export { makeDefaultInput };

type CurrentField = keyof BossInput["current"];

/** Max persisted screenshot previews (data URLs) before evicting the oldest. */
const MAX_SCREENSHOTS = 12;

/**
 * Debounced, quota-tolerant sessionStorage. Store updates fire on every
 * keystroke; this batches rapid writes into one (300ms trailing, flushed on tab
 * hide) and swallows QuotaExceededError so a full disk / private mode can never
 * crash a state update. Session storage keeps the plan intact across refreshes
 * within the tab (cleared when the tab/browser closes). A no-op on the server.
 */
function makeSafeStorage() {
  const noop = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  if (typeof window === "undefined") return noop;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let queued: { key: string; value: string } | null = null;
  const flush = () => {
    if (!queued) return;
    try {
      window.sessionStorage.setItem(queued.key, queued.value);
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
        return window.sessionStorage.getItem(name);
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
        window.sessionStorage.removeItem(name);
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

/** Max imported screenshots retained (data-URL thumbnails) before evicting oldest. */
const MAX_IMPORTS = 20;

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
   * whenever priority/goals change). Editing any single allocation switches this
   * off so manual tweaks aren't overwritten; "Auto-balance" turns it back on.
   */
  remoteAuto: boolean;
  /**
   * User-ranked priority, highest first, by boss id. Drives card order, bar fill
   * order, and which raids get cut when goals exceed a block's capacity (lowest
   * priority is filled last / falls short first). Ids absent sort after, in roster order.
   */
  priorityOrder: string[];
  toggleSelected: (bossId: string) => void;
  setSelected: (bossId: string, selected: boolean) => void;
  setCount: (bossId: string, variant: Variant, value: number) => void;
  setQuantity: (bossId: string, value: number) => void;
  /** Set the full priority order of the selected bosses (highest first). */
  setPriorityOrder: (ids: string[]) => void;
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
  setSkipCatch: (bossId: string, skip: boolean) => void;
  setMegaBuddy: (bossId: string, on: boolean) => void;
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
  resetSettings: () => void;
  resetAll: () => void;
}

// Per-species remote cap: Mewtwo is up both days (can absorb the whole budget),
// every other species is one day's worth (≤50, and never more than the budget).
// Clamp here so no write path — manual, auto-balance, or a corrupted persisted
// map — can exceed it.
function clampRemote(bossId: string, value: number, budget: number): number {
  const isMewtwo = bossId === MEWTWO_X_ID || bossId === MEWTWO_Y_ID;
  const cap = isMewtwo ? budget : Math.min(MAX_REMOTE_PER_SPECIES, budget);
  return Math.max(0, Math.min(cap, Number.isFinite(value) ? Math.round(value) : 0));
}

function ensureInput(state: PlannerState, bossId: string): BossInput | null {
  const existing = state.inputs[bossId];
  if (existing) return existing;
  const boss = getBoss(bossId);
  return boss ? makeDefaultInput(boss) : null;
}

/**
 * The selected bosses in effective priority order (highest first): explicit
 * `priorityOrder` first, then any unranked selected bosses in roster order.
 * Shared by the UI ranking list and the per-block plan so both agree.
 */
export function selectedInPriorityOrder(state: {
  inputs: Record<string, BossInput>;
  priorityOrder: string[];
}): string[] {
  const rank = new Map(state.priorityOrder.map((id, i) => [id, i] as const));
  return SORTED_BOSSES.filter((b) => state.inputs[b.id]?.selected)
    .map((b) => b.id)
    .sort((a, b) => (rank.get(a) ?? Infinity) - (rank.get(b) ?? Infinity));
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set) => ({
      inputs: {},
      settings: { ...DEFAULT_SETTINGS },
      research: {},
      screenshots: {},
      imports: [],
      raidsDone: {},
      remoteAllocations: {},
      remoteAuto: true,
      priorityOrder: [],

      setRaidsDone: (key, value) =>
        set((state) => {
          const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
          return { raidsDone: { ...state.raidsDone, [key]: safe } };
        }),

      setRemoteAllocation: (bossId, value) =>
        set((state) => {
          // A manual edit takes over from auto-balance so the user's tweaks stick.
          const v = clampRemote(bossId, value, state.settings.remoteRaidBudget);
          return { remoteAllocations: { ...state.remoteAllocations, [bossId]: v }, remoteAuto: false };
        }),

      setRemoteAllocations: (map) =>
        set((state) => {
          const budget = state.settings.remoteRaidBudget;
          const clamped: Record<string, number> = {};
          for (const id in map) clamped[id] = clampRemote(id, map[id], budget);
          return { remoteAllocations: clamped };
        }),

      setRemoteAuto: (on) => set({ remoteAuto: on }),

      addImports: (shots) =>
        set((state) => {
          const imports = [...state.imports, ...shots];
          // Cap the persisted imports so thumbnail data-URLs can't blow the
          // sessionStorage quota — evict the oldest beyond MAX_IMPORTS.
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
          const existing = state.inputs[bossId];
          const next = existing
            ? { ...existing, selected: !existing.selected }
            : makeDefaultInput(boss);
          return { inputs: { ...state.inputs, [bossId]: next } };
        }),

      setSelected: (bossId, selected) =>
        set((state) => {
          const boss = getBoss(bossId);
          if (!boss) return state;
          const existing = state.inputs[bossId];
          const next = existing
            ? { ...existing, selected }
            : { ...makeDefaultInput(boss), selected };
          return { inputs: { ...state.inputs, [bossId]: next } };
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

      setPriorityOrder: (ids) =>
        set((state) => {
          // The dragged order of the selected bosses first, then any previously-
          // ranked ids that aren't currently selected (preserve their relative rank).
          const others = state.priorityOrder.filter((id) => !ids.includes(id));
          return { priorityOrder: [...ids, ...others] };
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

      setSkipCatch: (bossId, skip) =>
        set((state) => {
          const input = ensureInput(state, bossId);
          if (!input) return state;
          return { inputs: { ...state.inputs, [bossId]: { ...input, skipCatch: skip } } };
        }),

      setMegaBuddy: (bossId, on) =>
        set((state) => {
          const input = ensureInput(state, bossId);
          if (!input) return state;
          return { inputs: { ...state.inputs, [bossId]: { ...input, megaBuddy: on } } };
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

      resetSettings: () => set({ settings: { ...DEFAULT_SETTINGS } }),

      resetAll: () =>
        set({
          inputs: {},
          settings: { ...DEFAULT_SETTINGS },
          research: {},
          screenshots: {},
          imports: [],
          raidsDone: {},
          remoteAllocations: {},
          remoteAuto: true,
          priorityOrder: [],
        }),
    }),
    {
      name: "gofest26-planner-v1",
      version: 11,
      storage: createJSONStorage(makeSafeStorage),
      migrate: (persisted) => {
        // Backfill defaults and guard against missing/corrupted fields so the
        // store always has a valid shape. Merging DEFAULT_SETTINGS under any
        // persisted settings picks up newly-added knobs (lobby size, party play).
        const state = (persisted ?? {}) as Partial<PlannerState>;
        if (!state.inputs) state.inputs = {};
        if (!state.research) state.research = {};
        if (!state.screenshots) state.screenshots = {};
        if (!Array.isArray(state.imports)) state.imports = [];
        if (!Array.isArray(state.priorityOrder)) state.priorityOrder = [];
        if (!state.raidsDone || typeof state.raidsDone !== "object") state.raidsDone = {};
        if (!state.remoteAllocations || typeof state.remoteAllocations !== "object") state.remoteAllocations = {};
        if (typeof state.remoteAuto !== "boolean") state.remoteAuto = true;
        state.settings = { ...DEFAULT_SETTINGS, ...(state.settings ?? {}) };
        return state as PlannerState;
      },
    },
  ),
);
