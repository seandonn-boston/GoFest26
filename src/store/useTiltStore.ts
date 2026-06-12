import { create } from "zustand";

/**
 * Bridges the gyroscope tilt (owned by TiltProvider, mounted in the page) to the
 * FAB control (ActionDock, a sibling). TiltProvider registers how to request
 * motion access and whether a sensor exists; the FAB renders an "Enable tilt"
 * item and calls `request`. Not persisted — purely in-session UI state.
 */
interface TiltState {
  /** A device-orientation sensor is present (so tilt can be offered). */
  supported: boolean;
  /** Motion access granted / the gyro is running. */
  enabled: boolean;
  /** Request motion permission / start the gyro. Set by TiltProvider. */
  request: () => void;
  _register: (request: () => void, supported: boolean) => void;
  _setEnabled: (enabled: boolean) => void;
}

export const useTiltStore = create<TiltState>((set) => ({
  supported: false,
  enabled: false,
  request: () => {},
  _register: (request, supported) => set({ request, supported }),
  _setEnabled: (enabled) => set({ enabled }),
}));
