import { create } from "zustand";

/**
 * Flips to `true` once the Substitute loading screen has fully lifted and the
 * app is revealed. Lets chrome that lives *outside* the loader (the install
 * banner) hold off until the loading view is gone instead of flashing in
 * behind/through the veil. In-session only — a refresh replays the loader and
 * resets this to false.
 */
interface AppReadyState {
  ready: boolean;
  setReady: () => void;
}

export const useAppReady = create<AppReadyState>((set) => ({
  ready: false,
  setReady: () => set({ ready: true }),
}));
