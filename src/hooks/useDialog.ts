"use client";

import { useEffect, useRef } from "react";
import { lockBodyScroll } from "@/lib/scrollLock";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal-dialog plumbing: while `open`, moves focus into the dialog,
 * traps Tab within it, closes on Escape, locks background scroll, and restores
 * focus to the trigger on close. Returns a ref to spread on the dialog container
 * (which should also carry role="dialog" aria-modal and a label).
 */
export function useDialog<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  // Hold the latest onClose without re-running the effect (so a fresh inline
  // callback each render doesn't tear down focus/scroll handling).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const node = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null) : [];

    (focusables()[0] ?? node)?.focus?.();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const f = focusables();
      if (f.length === 0) {
        e.preventDefault();
        return;
      }
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    const unlock = lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", onKey, true);
      unlock();
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return ref;
}
