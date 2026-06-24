"use client";

import { useState } from "react";
import { usePlannerStore } from "@/store/usePlannerStore";
import { useUiStore } from "@/store/useUiStore";
import { requestRegion } from "@/lib/geolocate";

/**
 * One-time prompt to use the visitor's real location for region-locked raids,
 * rather than silently assuming the app's default. Shown until the user picks
 * "use my location" or keeps the current region; the choice is remembered.
 */
export function LocationPrompt() {
  const asked = useUiStore((s) => s.locationAsked);
  const setAsked = useUiStore((s) => s.setLocationAsked);
  const setSettings = usePlannerStore((s) => s.setSettings);
  const regionLabel = usePlannerStore((s) => s.settings.region.label);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (asked) return null;

  const useLocation = async () => {
    setBusy(true);
    setFailed(false);
    const region = await requestRegion();
    setBusy(false);
    if (region) {
      setSettings({ region });
      setAsked();
    } else {
      setFailed(true); // denied / unavailable — let them keep the default
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-gofest-accent2/40 bg-gofest-accent2/10 p-3">
      <p className="text-sm font-semibold text-slate-100">Where are you raiding from?</p>
      <p className="mt-1 text-xs text-slate-300">
        Region-locked bosses depend on your location. We&apos;re currently assuming{" "}
        <b className="text-gofest-accent2">{regionLabel}</b> — use your real location instead?
        {failed ? (
          <span className="mt-1 block text-amber-300">
            Couldn&apos;t read your location — keep {regionLabel} or set it in the 📍 menu.
          </span>
        ) : null}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={useLocation}
          disabled={busy}
          className="rounded-md bg-gofest-accent2 px-3 py-1.5 text-xs font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Locating…" : "📍 Use my location"}
        </button>
        <button
          type="button"
          onClick={setAsked}
          className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-white/5"
        >
          Keep {regionLabel}
        </button>
      </div>
    </div>
  );
}
