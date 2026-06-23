"use client";

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
export function StepNav({
  steps,
  active,
  onSelect,
}: {
  steps: StepMeta[];
  active: StepId;
  onSelect: (id: StepId) => void;
}) {
  return (
    <nav
      aria-label="Planner steps"
      className="-mx-4 mb-6 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ol className="flex min-w-max items-stretch gap-2">
        {steps.map((s) => {
          const isActive = s.id === active;
          return (
            <li key={s.id} className="flex items-center gap-2">
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
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
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
                    className={`whitespace-nowrap text-xs font-semibold ${
                      isActive ? "text-slate-100" : "text-slate-300"
                    }`}
                  >
                    {s.label}
                  </span>
                  {s.optional ? (
                    <span className="text-[9px] uppercase tracking-wide text-slate-500">Optional</span>
                  ) : null}
                </span>
              </button>
              {s.id < steps.length ? <span aria-hidden className="text-slate-600">›</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
