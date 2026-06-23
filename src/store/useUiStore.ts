import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** Total steps in the planner flow (Pick → Import → Numbers → Prioritize → Results). */
export const STEP_COUNT = 5;
export type StepId = 1 | 2 | 3 | 4 | 5;

interface UiState {
  /** The step currently shown. Persisted so a refresh returns you where you were. */
  step: StepId;
  /** Whether the "How to use" guide has been dismissed (remembered per-device). */
  howToDismissed: boolean;
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
      howToDismissed: false,
      setStep: (step) => set({ step: clampStep(step) }),
      nextStep: () => set((s) => ({ step: clampStep(s.step + 1) })),
      prevStep: () => set((s) => ({ step: clampStep(s.step - 1) })),
      dismissHowTo: () => set({ howToDismissed: true }),
      reopenHowTo: () => set({ howToDismissed: false }),
    }),
    {
      name: "gofest26-ui-v1",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : noop)),
    },
  ),
);
