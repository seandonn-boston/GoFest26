import { useEffect, useRef, useState } from "react";
import { useUiStore } from "@/store/useUiStore";

/**
 * Open/closed state for a collapsible section that ALSO obeys the global
 * Expand-all / Collapse-all button. Between presses it toggles freely (like plain
 * useState); on each global press it snaps to the broadcast target. A section
 * mounted AFTER a press — e.g. a nested one revealed by expanding its parent —
 * inherits the current target, so "Expand all" reaches nested sections too.
 *
 * Drop-in for `useState(defaultOpen)`.
 */
export function useExpandable(defaultOpen = false): [boolean, (v: boolean | ((o: boolean) => boolean)) => void] {
  const nonce = useUiStore((s) => s.expandNonce);
  const target = useUiStore((s) => s.expandTarget);
  const [open, setOpen] = useState(nonce > 0 ? target : defaultOpen);
  const seen = useRef(nonce);
  useEffect(() => {
    if (nonce !== seen.current) {
      seen.current = nonce;
      setOpen(target);
    }
  }, [nonce, target]);
  return [open, setOpen];
}
