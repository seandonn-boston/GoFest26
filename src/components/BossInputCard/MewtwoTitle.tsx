import { GlitchText } from "@/components/ui/GlitchText";

const XY = "5.5rem"; // reserved height (the "X Y" letters live in MewtwoBackdrop now)
const MEWTWO = "2.75rem"; // 50% of the X/Y height

/**
 * Super Mega Mewtwo hero title text (centered, ≤350px) — SUPER MEGA over the
 * MEWTWO wordmark with its shiny-Mewtwo glitch. The big "X Y" letters and the
 * X / Y sprites are separate backdrop layers (MewtwoBackdrop); this text sits in
 * front of them.
 */
export function MewtwoTitle() {
  return (
    <div className="relative mx-auto flex max-w-[350px] flex-col items-center">
      <span className="text-sm font-extrabold uppercase tracking-[0.32em] text-slate-100 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
        Super Mega
      </span>
      <div className="relative flex items-center justify-center" style={{ height: XY }}>
        {/* Offset via `left`, NOT a transform: the glitch animation animates
            `transform`, which clobbers any translate-x utility put here. */}
        <GlitchText as="span" text="Mewtwo" className="mewtwo-word relative left-[6px]" style={{ fontSize: MEWTWO }} />
      </div>
    </div>
  );
}
