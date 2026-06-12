import { create } from "zustand";

/**
 * Bridges the gyroscope tilt (owned by TiltProvider, mounted in the page) to the
 * FAB control (ActionDock, a sibling). TiltProvider registers how to request
 * motion access and whether a sensor exists; the FAB toggles `enabled` on/off.
 * Gyroscope only — there is no scroll-driven tilt. Not persisted; in-session UI.
 */
interface TiltState {
  /** A device-orientation sensor is present (so tilt can be offered). */
  supported: boolean;
  /** Tilt is currently running. Toggled from the FAB. */
  enabled: boolean;
  /** Request motion permission, then enable. Set by TiltProvider. */
  request: () => void;
  /** Turn the tilt on/off directly (the FAB uses this to switch it off). */
  setEnabled: (enabled: boolean) => void;
  _register: (request: () => void, supported: boolean) => void;
}

export const useTiltStore = create<TiltState>((set) => ({
  supported: false,
  enabled: false,
  request: () => {},
  setEnabled: (enabled) => set({ enabled }),
  _register: (request, supported) => set({ request, supported }),
}));
