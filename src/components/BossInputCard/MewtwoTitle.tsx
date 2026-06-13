import { Sprite } from "@/components/ui/Sprite";

// X and Y share the same treatment — purple fill (#8E7CC3) with the vivid-purple
// glitch (in CSS) — so they read as a matched backdrop. MEWTWO is lavender on top.
const PURPLE = "#8E7CC3";

const XY = "5.5rem"; // X/Y backdrop size
const MEWTWO = "2.75rem"; // 50% of the X/Y height
const SPRITE = 97; // ~110% of the X/Y height (px)

/**
 * Super Mega Mewtwo hero title (centered, ≤350px). A big italic X (purple) and Y
 * (lavender) sit close together as a backdrop, eclipsed by MEWTWO; both X/Y and
 * MEWTWO carry the shiny-Mewtwo spearmint-green chromatic glitch. SUPER MEGA on
 * one line above. The two distinct Mega Mewtwo sprites flank and slightly overlap.
 */
export function MewtwoTitle({ spriteX, spriteY }: { spriteX?: string; spriteY?: string }) {
  return (
    <div className="mx-auto flex max-w-[350px] items-center justify-center">
      <span className="relative z-20 -mr-3 translate-x-[2px] shrink-0 [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.6))]">
        <Sprite src={spriteX} alt="Mega Mewtwo X" size={SPRITE} />
      </span>

      <div className="relative z-10 flex min-w-0 flex-col items-center">
        <span className="text-sm font-extrabold uppercase tracking-[0.32em] text-slate-100 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
          Super Mega
        </span>
        <div className="relative flex items-center justify-center" style={{ height: XY }}>
          <span aria-hidden className="absolute inset-0 z-0 flex items-center justify-center gap-[2px]">
            <span className="mewtwo-xy" style={{ color: PURPLE, fontSize: XY }}>X</span>
            <span className="mewtwo-xy" style={{ color: PURPLE, fontSize: XY }}>Y</span>
          </span>
          {/* Offset via `left`, NOT a transform: the glitch animation animates
              `transform`, which clobbers any translate-x utility put here. */}
          <span className="mewtwo-word relative z-10 left-1" style={{ fontSize: MEWTWO }}>
            Mewtwo
          </span>
        </div>
      </div>

      <span className="relative z-20 -ml-3 -translate-x-[26px] shrink-0 [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.6))]">
        <Sprite src={spriteY} alt="Mega Mewtwo Y" size={SPRITE} />
      </span>
    </div>
  );
}
