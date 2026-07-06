"use client";

import { useEffect, useRef } from "react";
import type { StepId } from "@/store/useUiStore";

export interface StepMeta {
  id: StepId;
  /** Short label shown under/next to the number. */
  label: string;
  /** True once the step's work is complete — shows a ✓ instead of the number. */
  done: boolean;
  /** Optional steps are clearly marked so users know they can skip them. */
  optional?: boolean;
}

/**
 * Free-form step navigator: a horizontally-scrollable row of numbered pills.
 * Every step is directly clickable (jump from 5 back to 1, no next/prev needed);
 * the active step is highlighted and completed steps show a ✓. Scrolls sideways
 * on narrow screens so it never crowds a phone.
 */
export function StepNav({ steps, active, onSelect }: { steps: StepMeta[]; active: StepId; onSelect: (id: StepId) => void }) {
  const navRef = useRef<HTMLElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  // Whenever the active step changes (a tap, or scroll-spy in one-page mode),
  // slide the row so the selected tile sits at the LEFT edge — the steps ahead
  // stay in view to its right.
  useEffect(() => {
    const nav = navRef.current;
    const li = activeRef.current;
    if (!nav || !li) return;
    const delta = li.getBoundingClientRect().left - nav.getBoundingClientRect().left;
    nav.scrollTo({ left: nav.scrollLeft + delta - 16, behavior: "smooth" }); // 16 = the px-4 gutter
  }, [active]);

  return (
    <nav
      ref={navRef}
      aria-label="Planner steps"
      // Pinned to the BOTTOM of the viewport at all times, so navigation is
      // always a thumb-reach away; scrolls sideways to keep the active step at
      // the left. The pills ride 16px (+ the safe-area inset) above the screen
      // edge via bottom PADDING — not a sticky offset — so the bar's backdrop
      // runs all the way down and no page content peeks through beneath it.
      className="sticky bottom-0 z-30 -mx-4 mt-6 overflow-x-auto border-t border-white/5 bg-gofest-bg/90 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ol className="flex min-w-max items-stretch gap-2">
        {steps.map((s) => {
          const isActive = s.id === active;
          return (
            <li key={s.id} ref={isActive ? activeRef : undefined} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={isActive ? "step" : undefined}
                className={`group flex items-center gap-2 rounded-lg border-2 px-2.5 py-1.5 text-left transition ${
                  isActive
                    ? "border-gofest-accent2 bg-gofest-accent2/15 shadow-brutal"
                    : "border-white/15 bg-gofest-panel/60 hover:border-white/35"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold ${
                    s.done
                      ? "border-emerald-400 bg-emerald-400 text-black"
                      : isActive
                        ? "border-gofest-accent2 bg-gofest-accent2 text-black"
                        : "border-white/30 text-slate-300"
                  }`}
                >
                  {s.done ? "✓" : s.id}
                </span>
                <span className="flex flex-col leading-tight">
                  <span
                    className={`whitespace-nowrap text-xs font-semibold ${isActive ? "text-slate-100" : "text-slate-300"}`}
                  >
                    {s.label}
                  </span>
                  {s.optional ? <span className="text-[11px] uppercase tracking-wide text-slate-500">Optional</span> : null}
                </span>
              </button>
              {s.id < steps.length ? (
                <span aria-hidden className="text-slate-600">
                  ›
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
