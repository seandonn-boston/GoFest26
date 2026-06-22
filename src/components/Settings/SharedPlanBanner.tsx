"use client";

import { useEffect, useState } from "react";
import { usePlannerStore } from "@/store/usePlannerStore";
import type { StateBackup } from "@/store/stateBackup";
import { decodeSharedPlan, clearPlanHash } from "@/lib/sharePlan";

/**
 * When the page is opened from a share link (#plan=…), offer to load it —
 * explicitly, never silently — so a link can't clobber the plan someone already
 * has. Reads the hash after mount to avoid any SSR/hydration mismatch.
 */
export function SharedPlanBanner() {
  const loadState = usePlannerStore((s) => s.loadState);
  const hasState = usePlannerStore((s) => Object.values(s.inputs).some((i) => i.selected));
  const [shared, setShared] = useState<StateBackup | null>(null);

  useEffect(() => {
    const plan = decodeSharedPlan(window.location.hash);
    if (plan) setShared(plan);
  }, []);

  if (!shared) return null;

  const dismiss = () => {
    clearPlanHash();
    setShared(null);
  };

  const open = () => {
    loadState(shared);
    dismiss();
  };

  return (
    <div className="rounded-lg border border-gofest-accent2/40 bg-gofest-accent2/10 p-3 text-sm">
      <p className="font-semibold text-slate-100">Someone shared a raid plan with you</p>
      <p className="mt-1 text-xs text-slate-300">
        Open it to load their bosses, holdings, and settings.{" "}
        {hasState ? <span className="text-amber-300">This replaces your current plan.</span> : null}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={open}
          className="rounded-md bg-gofest-accent2 px-3 py-1.5 text-xs font-semibold text-black transition hover:brightness-110"
        >
          Open shared plan
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/5"
        >
          Keep mine
        </button>
      </div>
    </div>
  );
}
