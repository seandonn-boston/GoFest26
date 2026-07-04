import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** Total steps in the planner flow (Pick → Enter what you have → Road of Legends
 *  → GO Fest Prioritizer → Remote Prioritizer → Results → Cost). */
export const STEP_COUNT = 7;
export type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** How the planner is laid out: the one-at-a-time stepper (default), or a single
 *  continuous page with every step stacked. Persisted per-device. */
export type Layout = "stepper" | "single";

/** Which side the floating action button (speed-dial) lives on — a right-handed
 *  (default) or left-handed thumb reach. Persisted per-device. */
export type FabSide = "left" | "right";

/** Visual theme. `dark` is the default neon "CyberClassic" look; `light` is a
 *  vivid bright-white theme with deep bold dark text (same colour families, just
 *  brightened for a sunlit read). Card/tile species names stay light. Persisted. */
export type Theme = "dark" | "light";

interface UiState {
  /** The step currently shown. Persisted so a refresh returns you where you were. */
  step: StepId;
  /** Stepper (one step at a time) vs. single-page (all steps stacked). */
  layout: Layout;
  setLayout: (layout: Layout) => void;
  /** Visual theme: Dark (default) or Light. */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Which side the FAB speed-dial sits on (right = default/right-handed). */
  fabSide: FabSide;
  setFabSide: (side: FabSide) => void;
  toggleFabSide: () => void;
  /** Whether the FAB speed-dial is open — shared so the opposite corner can swap
   *  the theme toggle for the "switch side" button while it's open. Not persisted. */
  fabOpen: boolean;
  setFabOpen: (open: boolean) => void;
  /** Priority list grouping: off = one flat list of individuals (mixed species);
   *  on = individuals grouped under each species, with the species ranked as a
   *  whole and copies ranked within. */
  groupBySpecies: boolean;
  setGroupBySpecies: (on: boolean) => void;
  /** Global expand/collapse-all broadcast. `expandNonce` bumps on each press;
   *  collapsible sections watch it and snap to `expandTarget` (true = expand).
   *  Nonce 0 = untouched, so sections keep their own mixed default state (and the
   *  button reads "Expand all"). Not persisted — a reload resets to the mixed init. */
  expandNonce: number;
  expandTarget: boolean;
  /** Expand (true) or collapse (false) every collapsible section at once. */
  setExpandAll: (target: boolean) => void;
  /** Whether the "How to use" guide has been dismissed (remembered per-device). */
  howToDismissed: boolean;
  /** Whether we've asked the user for their location yet (one-time prompt). */
  locationAsked: boolean;
  setLocationAsked: () => void;
  setStep: (step: StepId) => void;
  /** Move one step forward / back, clamped to the valid range. */
  nextStep: () => void;
  prevStep: () => void;
  dismissHowTo: () => void;
  reopenHowTo: () => void;
}

const clampStep = (n: number): StepId => Math.min(STEP_COUNT, Math.max(1, Math.round(n))) as StepId;

// localStorage is undefined during SSR; fall back to a no-op so the store never
// throws on the server. Client reads are gated behind the page's hydration check.
const noop = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      step: 1,
      layout: "stepper",
      setLayout: (layout) => set({ layout }),
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      fabSide: "right",
      setFabSide: (fabSide) => set({ fabSide }),
      toggleFabSide: () => set((s) => ({ fabSide: s.fabSide === "right" ? "left" : "right" })),
      fabOpen: false,
      setFabOpen: (fabOpen) => set({ fabOpen }),
      groupBySpecies: false,
      setGroupBySpecies: (on) => set({ groupBySpecies: on }),
      expandNonce: 0,
      expandTarget: false,
      setExpandAll: (target) => set((s) => ({ expandNonce: s.expandNonce + 1, expandTarget: target })),
      howToDismissed: false,
      locationAsked: false,
      setLocationAsked: () => set({ locationAsked: true }),
      setStep: (step) => set({ step: clampStep(step) }),
      nextStep: () => set((s) => ({ step: clampStep(s.step + 1) })),
      prevStep: () => set((s) => ({ step: clampStep(s.step - 1) })),
      dismissHowTo: () => set({ howToDismissed: true }),
      reopenHowTo: () => set({ howToDismissed: false }),
    }),
    {
      name: "gofest26-ui-v1",
      version: 8, // v8: drop density/reduceMotion; keep Dark/Light theme only
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : noop)),
      // The expand/collapse-all broadcast and the transient FAB-open flag are never
      // persisted, so a reload returns to the mixed initial state / a closed dial.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      partialize: ({ expandNonce, expandTarget, setExpandAll, fabOpen, setFabOpen, ...rest }) => rest as UiState,
      migrate: (persisted) => {
        const s = (persisted ?? {}) as Partial<UiState> & Record<string, unknown>;
        if (typeof s.step === "number") s.step = clampStep(s.step);
        if (s.layout !== "single" && s.layout !== "stepper") s.layout = "stepper";
        if (s.fabSide !== "left" && s.fabSide !== "right") s.fabSide = "right";
        // v8: drop Poké Center, Compact and the reduce-motion toggle. Keep the
        // Dark/Light theme (migrating the older night/sun/pokecenter values).
        const t = (s as Record<string, unknown>).theme;
        s.theme = t === "light" || t === "sun" ? "light" : "dark";
        delete (s as Record<string, unknown>).density;
        delete (s as Record<string, unknown>).reduceMotion;
        return s as UiState;
      },
    },
  ),
);
