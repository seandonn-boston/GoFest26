import { useEffect, useState } from "react";

/**
 * Returns true once the component has mounted on the client. Used to gate
 * rendering of localStorage-backed state so server and first client render
 * agree (avoids hydration mismatches with the persisted Zustand store).
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
