"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A number that turns into an inline input on click. Committing (Enter / blur)
 * calls onCommit with the clamped value — the caller wires this to the same
 * store setter the card uses, so editing here overwrites the card field and
 * cascades the recompute. While idle it shows the live `value` prop.
 */
export function EditableNumber({
  value,
  onCommit,
  min,
  max,
  className = "",
}: {
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n)) {
      let v = n;
      if (min !== undefined) v = Math.max(min, v);
      if (max !== undefined) v = Math.min(max, v);
      onCommit(Math.round(v));
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={ref}
        type="number"
        value={draft}
        min={min}
        max={max}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") setEditing(false);
        }}
        className={`w-16 rounded border border-gofest-accent2/60 bg-black/70 px-1 text-center tabular-nums text-gofest-accent2 outline-none ${className}`}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      title="Click to edit — overwrites the card value and recalculates"
      className={`rounded px-0.5 font-semibold text-gofest-accent2 underline decoration-dotted decoration-gofest-accent2/60 underline-offset-2 hover:bg-gofest-accent2/15 ${className}`}
    >
      {value}
    </button>
  );
}
