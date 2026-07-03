"use client";

import { type ReactNode } from "react";
import { PlusToggle } from "./PlusToggle";
import { useExpandable } from "@/hooks/useExpandable";

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
  const [open, setOpen] = useExpandable(defaultOpen);
  return (
    <div className="rounded-lg border border-white/10 bg-gofest-bg/30 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <span className="flex items-center gap-1.5 text-slate-300">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {hint ? <span>{hint}</span> : null}
          <PlusToggle open={open} size={14} className="text-slate-400" />
        </span>
      </button>
      {open ? <div className="border-t border-white/10 px-3 py-2">{children}</div> : null}
    </div>
  );
}
