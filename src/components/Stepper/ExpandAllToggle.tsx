"use client";

import { useUiStore } from "@/store/useUiStore";

/**
 * A single button that expands or collapses every collapsible section at once
 * (including nested ones). It sits beside the layout toggle. Because the app
 * starts in a mixed expanded/collapsed state, it reads "Expand all" on init;
 * after an expand it flips to "Collapse all", and vice-versa.
 */
export function ExpandAllToggle() {
  const expanded = useUiStore((s) => s.expandNonce > 0 && s.expandTarget);
  const setExpandAll = useUiStore((s) => s.setExpandAll);
  return (
    <button
      type="button"
      onClick={() => setExpandAll(!expanded)}
      aria-pressed={expanded}
      title={expanded ? "Collapse every section" : "Expand every section"}
      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-gofest-panel/60 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:text-white"
    >
      <span aria-hidden className="text-sm leading-none">
        {expanded ? "−" : "+"}
      </span>
      {expanded ? "Collapse all" : "Expand all"}
    </button>
  );
}
