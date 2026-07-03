import { useEffect, useState } from "react";

/**
 * A value that only updates after it has stopped changing for `delayMs`. Unlike
 * `useDeferredValue` (which lets React render a stale value but still recomputes
 * on every settled keystroke), this bounds the heavy planner recompute to at most
 * once per burst of typing — the input fields stay instant (they read/write the
 * store directly), while the expensive summary / block-plan / remote-balance work
 * runs only after you pause. Keeps live realtime updates without a Save button,
 * without melting the tab when everything is selected and expanded.
 */
export function useDebouncedValue<T>(value: T, delayMs = 180): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
