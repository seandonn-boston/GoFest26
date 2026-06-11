import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getBoss, SORTED_BOSSES } from "@/data";
import { PRESETS } from "@/data/presets";
import { makeDefaultInput } from "@/domain/defaults";
import { DEFAULT_SETTINGS, type PlannerSettings } from "@/domain/settings";
import type { BossInput, Variant } from "@/domain/types";

export { makeDefaultInput };

type CurrentField = keyof BossInput["current"];

/** Max persisted screenshot previews (data URLs) before evicting the oldest. */
const MAX_SCREENSHOTS = 12;

/**
 * Debounced, quota-tolerant localStorage. Store updates fire on every keystroke;
 * this batches rapid writes into one (300ms trailing, flushed on tab hide) and
 * swallows QuotaExceededError so a full disk / private mode can never crash a
 * state update. A no-op on the server (no persistence there).
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

interface PlannerState {
  inputs: Record<string, BossInput>;
  settings: PlannerSettings;
  /** Which research lines the user has (or will) complete, by id. */
  research: Record<string, boolean>;
  /** Imported screenshot previews, keyed by species — only the latest is kept. */
  screenshots: Record<string, ScreenshotPreview>;
  /**
   * User-ranked priority, highest first, by boss id. Drives card order, bar fill
   * order, and which raids get greyed out when goals exceed capacity (lowest
   * priority is cut first). Ids absent from the list sort after, in roster order.
   */
  priorityOrder: string[];
  toggleSelected: (bossId: string) => void;
  setSelected: (bossId: string, selected: boolean) => void;
  setCount: (bossId: string, variant: Variant, value: number) => void;
  setQuantity: (bossId: string, value: number) => void;
  /** Move a boss one step up (toward higher priority) or down within the order. */
  reprioritize: (bossId: string, direction: "up" | "down") => void;
  setCurrent: (bossId: string, field: CurrentField, value: number) => void;
  setTargetLevel: (bossId: string, level: number) => void;
  setTargetMegaLevel: (bossId: string, megaLevel: number) => void;
  setSkipCatch: (bossId: string, skip: boolean) => void;
  setMegaBuddy: (bossId: string, on: boolean) => void;
  setResearchEnabled: (id: string, enabled: boolean, exclusiveWith?: readonly string[]) => void;
  /** Store a screenshot preview for a species — keeps only the most-recent. */
  setScreenshot: (speciesKey: string, src: string, capturedAt: number) => void;
  applyPreset: (bossId: string, presetId: string) => void;
  setSettings: (patch: Partial<PlannerSettings>) => void;
  resetSettings: () => void;
  resetAll: () => void;
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
      priorityOrder: [],

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

      reprioritize: (bossId, direction) =>
        set((state) => {
          const order = selectedInPriorityOrder(state);
          const i = order.indexOf(bossId);
          const j = direction === "up" ? i - 1 : i + 1;
          if (i < 0 || j < 0 || j >= order.length) return state;
          [order[i], order[j]] = [order[j], order[i]];
          // Re-materialize the full explicit order: the reordered selected ids
          // first, then any previously-ranked ids that aren't currently selected.
          const others = state.priorityOrder.filter((id) => !order.includes(id));
          return { priorityOrder: [...order, ...others] };
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
        set({ inputs: {}, settings: { ...DEFAULT_SETTINGS }, research: {}, screenshots: {}, priorityOrder: [] }),
    }),
    {
      name: "gofest26-planner-v1",
      version: 6,
      storage: createJSONStorage(makeSafeStorage),
      migrate: (persisted) => {
        // Backfill defaults and guard against missing/corrupted fields so the
        // store always has a valid shape. Merging DEFAULT_SETTINGS under any
        // persisted settings picks up newly-added knobs (lobby size, party play).
        const state = (persisted ?? {}) as Partial<PlannerState>;
        if (!state.inputs) state.inputs = {};
        if (!state.research) state.research = {};
        if (!state.screenshots) state.screenshots = {};
        if (!Array.isArray(state.priorityOrder)) state.priorityOrder = [];
        state.settings = { ...DEFAULT_SETTINGS, ...(state.settings ?? {}) };
        return state as PlannerState;
      },
    },
  ),
);
