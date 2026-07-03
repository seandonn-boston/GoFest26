"use client";

import type { Layout } from "@/store/useUiStore";

/**
 * Segmented control to switch between the one-step-at-a-time stepper and the
 * single continuous page (every step stacked). Small and unobtrusive — it rides
 * just above the step nav.
 */
export function LayoutToggle({ layout, onChange }: { layout: Layout; onChange: (l: Layout) => void }) {
  const opts: Array<{ id: Layout; label: string }> = [
    { id: "stepper", label: "Steps" },
    { id: "single", label: "One page" },
  ];
  return (
    <div
      role="group"
      aria-label="Layout"
      className="inline-flex items-center gap-0.5 rounded-lg border border-white/15 bg-gofest-panel/60 p-0.5"
    >
      {opts.map((o) => {
        const active = layout === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              active ? "bg-gofest-accent2 text-black shadow-brutal" : "text-slate-300 hover:text-white"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
