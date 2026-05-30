import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getBoss } from "@/data";
import { PRESETS } from "@/data/presets";
import { makeDefaultInput } from "@/domain/defaults";
import { DEFAULT_SETTINGS, type PlannerSettings } from "@/domain/settings";
import type { BossInput, Variant } from "@/domain/types";

export { makeDefaultInput };

type CurrentField = keyof BossInput["current"];

interface PlannerState {
  inputs: Record<string, BossInput>;
  settings: PlannerSettings;
  toggleSelected: (bossId: string) => void;
  setVariant: (bossId: string, variant: Variant) => void;
  setCurrent: (bossId: string, field: CurrentField, value: number) => void;
  setTargetLevel: (bossId: string, level: number) => void;
  setTargetMegaLevel: (bossId: string, megaLevel: number) => void;
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

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set) => ({
      inputs: {},
      settings: { ...DEFAULT_SETTINGS },

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

      setVariant: (bossId, variant) =>
        set((state) => {
          const input = ensureInput(state, bossId);
          if (!input) return state;
          return { inputs: { ...state.inputs, [bossId]: { ...input, variant } } };
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

      resetAll: () => set({ inputs: {}, settings: { ...DEFAULT_SETTINGS } }),
    }),
    {
      name: "gofest26-planner-v1",
      version: 2,
      migrate: (persisted) => {
        // v1 had no settings slice; backfill defaults. Also guard against
        // missing/corrupted fields so the store always has a valid shape.
        const state = (persisted ?? {}) as Partial<PlannerState>;
        if (!state.inputs) state.inputs = {};
        if (!state.settings) state.settings = { ...DEFAULT_SETTINGS };
        return state as PlannerState;
      },
    },
  ),
);
