import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getBoss, SORTED_BOSSES } from "@/data";
import { FORM_META } from "@/data/formGroups";
import { RESEARCH_LINES } from "@/data/research";
import { globalPriorityFromBlocks } from "@/domain/blockPlan";
import { PRESETS } from "@/data/presets";
import { makeDefaultInput } from "@/domain/defaults";
import { DEFAULT_SETTINGS, type PlannerSettings, type CalibrationMetric } from "@/domain/settings";
import type { BossInput, Variant } from "@/domain/types";
import type { ScanResult } from "@/lib/screenshotScan";
import { idbGet, idbSet } from "@/lib/idbStore";
import type { StateBackup } from "./stateBackup";

export { makeDefaultInput };

type CurrentField = keyof BossInput["current"];

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
  setCount: (bossId: string, variant: Variant, value: number) => void;
  setQuantity: (bossId: string, value: number) => void;
  setVariant: (bossId: string, variant: Variant) => void;
  /** Set one block's priority order (highest first). */
  setBlockPriority: (blockKey: string, ids: string[]) => void;
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
  setSkipCatch: (bossId: string, skip: boolean) => void;
  setMegaBuddy: (bossId: string, on: boolean) => void;
  setL4Buddy: (bossId: string, on: boolean) => void;
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

// Every GO Fest research line counts toward goals by default (both on).
const DEFAULT_RESEARCH: Record<string, boolean> = Object.fromEntries(RESEARCH_LINES.map((l) => [l.id, true]));

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set) => ({
      inputs: {},
      settings: { ...DEFAULT_SETTINGS },
      research: { ...DEFAULT_RESEARCH },
      screenshots: {},
      imports: [],
      raidsDone: {},
      remoteAllocations: {},
      remoteAuto: false,
      blockPriority: {},
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
          if (!getBoss(bossId)) return state;
          const cur = state.inputs[bossId]?.selected ?? false;
          return { inputs: selectFamily(state.inputs, bossId, !cur) };
        }),

      setSelected: (bossId, selected) =>
        set((state) => {
          if (!getBoss(bossId)) return state;
          return { inputs: selectFamily(state.inputs, bossId, selected) };
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

      setBlockPriority: (blockKey, ids) =>
        set((state) => ({ blockPriority: { ...state.blockPriority, [blockKey]: ids } })),

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

      setL4Buddy: (bossId, on) =>
        set((state) => {
          const input = ensureInput(state, bossId);
          if (!input) return state;
          return { inputs: { ...state.inputs, [bossId]: { ...input, l4Buddy: on } } };
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
          inputs: {},
          settings: { ...DEFAULT_SETTINGS },
          research: { ...DEFAULT_RESEARCH },
          screenshots: {},
          imports: [],
          raidsDone: {},
          remoteAllocations: {},
          remoteAuto: false,
          blockPriority: {},
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
          quickCatchBlocks: b.quickCatchBlocks ?? {},
          remoteAllocations: b.remoteAllocations ?? {},
          remoteAuto: typeof b.remoteAuto === "boolean" ? b.remoteAuto : false,
          raidsDone: b.raidsDone ?? {},
          playDays: b.playDays ?? {},
        }),
    }),
    {
      name: "gofest26-planner-v1",
      version: 17, // +megaBuddyLevel setting (backfilled via DEFAULT_SETTINGS merge)
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
