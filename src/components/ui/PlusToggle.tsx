"use client";

/**
 * A "+" that morphs into an "×" when `open`. The two strokes spin in opposite
 * directions — the vertical stroke 270° counter-clockwise, the horizontal stroke
 * 270° clockwise — while the wrapper simultaneously rotates 45° counter-clockwise
 * around the same origin, so the symbol whirls and settles into an ×. Replaces
 * the old ▸ carets on collapsible headers.
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
    <span aria-hidden className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      {/* The whole symbol turns 45° CCW as the strokes spin. */}
      <span
        className="absolute inset-0 block"
        style={{ transform: `rotate(${open ? -45 : 0}deg)`, transition }}
      >
        {/* Vertical stroke — 270° counter-clockwise. */}
        <span
          className={base}
          style={{ width: stroke, height: len, transform: `translate(-50%, -50%) rotate(${open ? -270 : 0}deg)`, transition }}
        />
        {/* Horizontal stroke — 270° clockwise. */}
        <span
          className={base}
          style={{ width: len, height: stroke, transform: `translate(-50%, -50%) rotate(${open ? 270 : 0}deg)`, transition }}
        />
      </span>
    </span>
  );
}
