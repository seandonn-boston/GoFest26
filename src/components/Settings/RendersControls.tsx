"use client";

import { useUiStore, type Theme } from "@/store/useUiStore";
import { useTiltStore } from "@/store/useTiltStore";
import { useIsMobile } from "@/hooks/useIsMobile";

const THEMES: { id: Theme; label: string; hint: string; soon?: boolean }[] = [
  { id: "dark", label: "Dark", hint: "CyberClassic — neon on black" },
  { id: "light", label: "Light", hint: "Bright white, bold ink" },
  { id: "pokecenter", label: "Poké Center", hint: "Red · white · ice-blue", soon: true },
];

function Toggle({
  on,
  onChange,
  label,
  hint,
  disabled,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-gofest-bg/40 px-3 py-2.5 ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-200">{label}</span>
        {hint ? <span className="block text-[12px] text-slate-500">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        className="h-5 w-5 shrink-0 accent-gofest-accent2 disabled:opacity-40"
        checked={on}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

/**
 * "Renders" panel (in the FAB speed-dial): how the app looks and moves — the
 * visual Theme, layout Density (compact), Reduce-motion, and the gyroscope Tilt.
 * These persist per-device (except tilt). Tilt and reduce-motion are mutually
 * exclusive: turning motion off also turns tilt off.
 */
export function RendersControls() {
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const density = useUiStore((s) => s.density);
  const setDensity = useUiStore((s) => s.setDensity);
  const reduceMotion = useUiStore((s) => s.reduceMotion);
  const setReduceMotion = useUiStore((s) => s.setReduceMotion);

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
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                disabled={t.soon}
                onClick={() => setTheme(t.id)}
                aria-pressed={active}
                title={t.soon ? "Coming soon" : t.hint}
                className={`flex flex-col items-start rounded-lg border-2 px-2.5 py-2 text-left transition ${
                  active
                    ? "border-gofest-accent2 bg-gofest-accent2/15"
                    : "border-white/15 bg-gofest-bg/40 hover:border-white/35"
                } ${t.soon ? "cursor-not-allowed opacity-45" : ""}`}
              >
                <span className="text-sm font-semibold text-slate-100">{t.label}</span>
                <span className="text-[11px] leading-tight text-slate-500">{t.soon ? "Soon" : t.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Density */}
      <Toggle
        label="Compact layout"
        hint="Tighter spacing + smaller sprites everywhere"
        on={density === "compact"}
        onChange={(v) => setDensity(v ? "compact" : "cozy")}
      />

      {/* Reduce motion */}
      <Toggle
        label="Reduce motion"
        hint="Stops glitching, tilt, the ✕/+ morphs and single-page"
        on={reduceMotion}
        onChange={(v) => {
          setReduceMotion(v);
          if (v) setTiltEnabled(false); // motion off ⇒ tilt off
        }}
      />

      {/* Tilt */}
      {isMobile && tiltSupported ? (
        <Toggle
          label="Gyroscope tilt"
          hint="The cards & badge lean with your phone"
          on={tiltEnabled}
          disabled={reduceMotion}
          onChange={(v) => {
            if (v) requestTilt();
            else setTiltEnabled(false);
          }}
        />
      ) : (
        <div className="rounded-lg border border-white/10 bg-gofest-bg/40 px-3 py-2.5 text-[12px] text-slate-500">
          Gyroscope tilt appears here on a phone/tablet with a motion sensor.
        </div>
      )}
    </div>
  );
}
