"use client";

/**
 * A "+" that morphs into an "×" when `open`, echoing the green FAB's hamburger
 * animation but smaller. The two strokes don't just rotate 45° — they swing a
 * full 315°: the vertical stroke counter-clockwise, the horizontal stroke
 * clockwise, on the same easing and duration, so the symbol spins as it forms
 * the ×. Replaces the old ▸ carets on collapsible headers.
 */
export function PlusToggle({
  open,
  size = 20,
  className = "",
}: {
  open: boolean;
  size?: number;
  className?: string;
}) {
  const len = Math.round(size * 0.8);
  const stroke = Math.max(2, Math.round(size * 0.12));
  const transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
  const base = "absolute left-1/2 top-1/2 block rounded-full bg-current";
  return (
    <span aria-hidden className={`relative block ${className}`} style={{ width: size, height: size }}>
      {/* Vertical stroke — counter-clockwise 315°. */}
      <span
        className={base}
        style={{ width: stroke, height: len, transform: `translate(-50%, -50%) rotate(${open ? -315 : 0}deg)`, transition }}
      />
      {/* Horizontal stroke — clockwise 315°. */}
      <span
        className={base}
        style={{ width: len, height: stroke, transform: `translate(-50%, -50%) rotate(${open ? 315 : 0}deg)`, transition }}
      />
    </span>
  );
}
