"use client";

import { useUiStore, type Theme } from "@/store/useUiStore";
import { useTiltStore } from "@/store/useTiltStore";
import { useIsMobile } from "@/hooks/useIsMobile";

const THEMES: { id: Theme; label: string; hint: string }[] = [
  { id: "dark", label: "Dark", hint: "CyberClassic — neon on black" },
  { id: "light", label: "Light", hint: "Bright white, bold dark ink" },
];

/**
 * "Renders" panel (in the FAB speed-dial): how the app looks and moves — the
 * visual Theme (Dark / Light) and the optional gyroscope Tilt that leans the
 * cards and badge with your phone.
 */
export function RendersControls() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const isMobile = useIsMobile();
  const tiltSupported = useTiltStore((s) => s.supported);
  const tiltEnabled = useTiltStore((s) => s.enabled);
  const requestTilt = useTiltStore((s) => s.request);
  const setTiltEnabled = useTiltStore((s) => s.setEnabled);

  return (
    <div className="space-y-4">
      {/* Theme */}
      <div>
        <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-400">Theme</div>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => setTheme(t.id)}
                className={`flex flex-col items-start rounded-lg border-2 px-2.5 py-2 text-left transition ${
                  active
                    ? "border-gofest-accent2 bg-gofest-accent2/15"
                    : "border-white/15 bg-gofest-bg/40 hover:border-white/35"
                }`}
              >
                <span className="text-sm font-semibold text-slate-100">{t.label}</span>
                <span className="text-[11px] leading-tight text-slate-500">{t.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Gyroscope tilt */}
      <div>
        <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-slate-400">Motion</div>
        {isMobile && tiltSupported ? (
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/10 bg-gofest-bg/40 px-3 py-2.5">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-200">Gyroscope tilt</span>
              <span className="block text-[12px] text-slate-500">The cards &amp; badge lean with your phone</span>
            </span>
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0 accent-gofest-accent2"
              checked={tiltEnabled}
              onChange={(e) => (e.target.checked ? requestTilt() : setTiltEnabled(false))}
            />
          </label>
        ) : (
          <div className="rounded-lg border border-white/10 bg-gofest-bg/40 px-3 py-2.5 text-[12px] text-slate-500">
            Gyroscope tilt appears here on a phone/tablet with a motion sensor.
          </div>
        )}
      </div>
    </div>
  );
}
