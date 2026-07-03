import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** Total steps in the planner flow (Pick → Enter what you have → Road of Legends
 *  → GO Fest Prioritizer → Remote Prioritizer → Cost). */
export const STEP_COUNT = 6;
export type StepId = 1 | 2 | 3 | 4 | 5 | 6;

/** How the planner is laid out: the one-at-a-time stepper (default), or a single
 *  continuous page with every step stacked. Persisted per-device. */
export type Layout = "stepper" | "single";

/** Colour theme. `night` is the default neon-dark look; `sun` is a higher-contrast
 *  variant tuned for reading outdoors in bright sunlight (glare films removed, dim
 *  text + faint borders lifted). Persisted per-device. */
export type Theme = "night" | "sun";

interface UiState {
  /** The step currently shown. Persisted so a refresh returns you where you were. */
  step: StepId;
  /** Stepper (one step at a time) vs. single-page (all steps stacked). */
  layout: Layout;
  setLayout: (layout: Layout) => void;
  /** Colour theme: neon `night` (default) or high-contrast `sun` for outdoors. */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
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
      theme: "night",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "sun" ? "night" : "sun" })),
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
      version: 4, // v2: remote → own step (6 steps); v3: layout added; v4: theme added
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : noop)),
      // The expand/collapse-all broadcast is transient — never persist it, so a
      // reload always returns to the mixed initial state with the button at "Expand all".
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      partialize: ({ expandNonce, expandTarget, setExpandAll, ...rest }) => rest as UiState,
      migrate: (persisted) => {
        const s = (persisted ?? {}) as Partial<UiState>;
        if (typeof s.step === "number") s.step = clampStep(s.step);
        if (s.layout !== "single" && s.layout !== "stepper") s.layout = "stepper";
        if (s.theme !== "sun" && s.theme !== "night") s.theme = "night";
        return s as UiState;
      },
    },
  ),
);
