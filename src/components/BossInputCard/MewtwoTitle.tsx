import { GlitchText } from "@/components/ui/GlitchText";

const BOX = "5.5rem"; // reserved title height; the "X Y" letters center inside it
const XY = "7.7rem"; // big "X Y" letters (line-height 0.8 keeps them inside the box)
const MEWTWO = "2.75rem"; // 50% of the box height
const PURPLE = "#8E7CC3"; // matches the wordmark's purple family

/**
 * Super Mega Mewtwo hero title text (centered, ≤350px) — SUPER MEGA over the
 * MEWTWO wordmark with its shiny-Mewtwo glitch. The big "X Y" letters live in the
 * same reserved-height box, centered BEHIND the wordmark — anchoring them here
 * (rather than over the whole header) keeps them aligned with MEWTWO no matter
 * how tall the description below wraps (portrait vs landscape). The X / Y
 * sprites are a separate backdrop layer (MewtwoBackdrop) behind this text.
 */
export function MewtwoTitle() {
  return (
    <div className="relative mx-auto flex max-w-[350px] flex-col items-center">
      <span className="text-sm font-extrabold uppercase tracking-[0.32em] text-slate-100 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
        Super Mega
      </span>
      <div className="relative flex items-center justify-center" style={{ height: BOX }}>
        <span aria-hidden className="absolute inset-0 z-0 flex items-center justify-center gap-[2px]">
          <GlitchText as="span" text="X" className="mewtwo-xy" style={{ color: PURPLE, fontSize: XY }} />
          <GlitchText as="span" text="Y" className="mewtwo-xy relative left-[2px]" style={{ color: PURPLE, fontSize: XY }} />
        </span>
        {/* Offset via `left`, NOT a transform: the glitch animation animates
            `transform`, which clobbers any translate-x utility put here. */}
        <GlitchText as="span" text="Mewtwo" className="mewtwo-word relative z-10 left-[6px]" style={{ fontSize: MEWTWO }} />
      </div>
    </div>
  );
}
