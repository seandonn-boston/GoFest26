import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** Total steps in the planner flow (Pick → Enter what you have → Prioritize →
 *  Results → Cost). */
export const STEP_COUNT = 5;
export type StepId = 1 | 2 | 3 | 4 | 5;

interface UiState {
  /** The step currently shown. Persisted so a refresh returns you where you were. */
  step: StepId;
  /** Priority list grouping: off = one flat list of individuals (mixed species);
   *  on = individuals grouped under each species, with the species ranked as a
   *  whole and copies ranked within. */
  groupBySpecies: boolean;
  setGroupBySpecies: (on: boolean) => void;
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
      groupBySpecies: false,
      setGroupBySpecies: (on) => set({ groupBySpecies: on }),
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
      version: 1, // clamp any stored step into range (a dedicated Cost step makes 5)
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : noop)),
      migrate: (persisted) => {
        const s = (persisted ?? {}) as Partial<UiState>;
        if (typeof s.step === "number") s.step = clampStep(s.step);
        return s as UiState;
      },
    },
  ),
);
