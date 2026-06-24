"use client";

import { useRef, type TouchEvent as ReactTouchEvent } from "react";

const MIN_DISTANCE = 60; // px — ignore small drags
const HORIZONTAL_RATIO = 2; // dx must dominate dy to count as a horizontal swipe

// Don't hijack a swipe that starts on something the user is actually operating:
// form fields, the group/off switch, or a drag-to-rank grip (those handle their
// own horizontal motion).
const GUARD = 'input, textarea, select, button, [role="switch"], [aria-label^="Reorder"], [data-noswipe]';

/**
 * Left/right swipe → next/previous. Returns touch handlers to spread onto the
 * element that should be swipeable. Touch-only, so mouse/desktop is unaffected;
 * a swipe must be clearly horizontal (and far enough) to fire, so it doesn't
 * fight vertical scrolling or the drag-to-rank lists.
 */
export function useSwipeNav({
  onLeft,
  onRight,
  enabled = true,
}: {
  onLeft: () => void;
  onRight: () => void;
  enabled?: boolean;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: ReactTouchEvent) => {
    if (!enabled || e.touches.length !== 1 || (e.target as HTMLElement).closest?.(GUARD)) {
      start.current = null;
      return;
    }
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: ReactTouchEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO) return;
    if (dx < 0) onLeft();
    else onRight();
  };

  return { onTouchStart, onTouchEnd };
}
