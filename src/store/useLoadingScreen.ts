import { create } from "zustand";

/**
 * Full-screen Substitute loading screen for in-app work (e.g. the screenshot
 * scanning process). Any flow can put it up:
 *
 *   begin() → setProgress(pct)… → finish()
 *
 * The screen's HP bar drains toward the reported progress; while progress is
 * null (no measurable signal yet) it creeps and holds short of the end. After
 * finish(), the KO + fade sequence plays out before the overlay clears itself.
 */
interface LoadingScreenState {
  /** Overlay visibility — stays true through the KO/fade theater. */
  active: boolean;
  /** Real progress 0–100, or null while busy with no measurable progress. */
  progress: number | null;
  /** Bumped per begin() so the overlay restarts cleanly if runs overlap. */
  runId: number;
  begin: () => void;
  setProgress: (pct: number) => void;
  /** Mark the work complete; the overlay dismisses itself once the doll faints. */
  finish: () => void;
  /** Internal — called by the overlay after its fade-out completes. */
  dismiss: () => void;
}

export const useLoadingScreen = create<LoadingScreenState>((set) => ({
  active: false,
  progress: null,
  runId: 0,
  begin: () => set((s) => ({ active: true, progress: null, runId: s.runId + 1 })),
  setProgress: (pct) => set({ progress: Math.max(0, Math.min(100, pct)) }),
  finish: () => set({ progress: 100 }),
  dismiss: () => set({ active: false, progress: null }),
}));
