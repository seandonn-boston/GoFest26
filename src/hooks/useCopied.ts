import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Clipboard copy with a transient "copied!" flag. The reset timer is cleared on
 * unmount (and re-armed on each copy), so the flag never sets state after the
 * component is gone. Returns `[copied, copy]`.
 */
export function useCopied(resetMs = 1500): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetMs);
      } catch {
        setCopied(false);
      }
    },
    [resetMs],
  );

  return [copied, copy];
}
