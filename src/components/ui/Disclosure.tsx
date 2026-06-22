"use client";

import { useState, type ReactNode } from "react";

/**
 * A collapsible bordered panel: a header button with a rotating caret, an
 * optional right-aligned hint, and a body revealed on click. The shared shell
 * behind the "Calibrate", "How accurate", and "How capacity is calculated"
 * sections — collapsed by default so detail is one tap away, never in the way.
 */
export function Disclosure({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: ReactNode;
  /** Right-aligned summary shown while collapsed (caller styles its own text). */
  hint?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-white/10 bg-gofest-bg/30 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="text-slate-300">
          <span className={`mr-1 inline-block text-slate-500 transition-transform ${open ? "rotate-90" : ""}`}>▸</span>
          {title}
        </span>
        {hint ? <span className="shrink-0">{hint}</span> : null}
      </button>
      {open ? <div className="border-t border-white/10 px-3 py-2">{children}</div> : null}
    </div>
  );
}
