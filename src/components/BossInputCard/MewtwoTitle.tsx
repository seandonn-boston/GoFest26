import type { CSSProperties } from "react";
import { Sprite } from "@/components/ui/Sprite";

// Colors pulled from the Mewtwo sprite — purple body / lavender accents — and the
// shiny's spearmint green for the chromatic glitch.
const PURPLE = "#8E7CC3"; // X
const LIGHT_PURPLE = "#CFC3E8"; // Y
const SPEARMINT = "#5BE3A8"; // shiny-Mewtwo glitch
const MEWTWO_PURPLE = "#b026ff"; // matches the "RAID" word in the page title (gofest-mewtwo)

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
      <span className="relative z-20 -mr-3 shrink-0 [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.6))]">
        <Sprite src={spriteX} alt="Mega Mewtwo X" size={SPRITE} />
      </span>

      <div className="relative z-10 flex min-w-0 flex-col items-center">
        <span className="text-sm font-extrabold uppercase tracking-[0.32em] text-slate-100 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
          Super Mega
        </span>
        <div className="relative flex items-center justify-center" style={{ height: XY }}>
          <span aria-hidden className="absolute inset-0 z-0 flex items-center justify-center gap-[2px]">
            <span className="mewtwo-xy" style={{ color: PURPLE, fontSize: XY }}>X</span>
            <span className="mewtwo-xy" style={{ color: LIGHT_PURPLE, fontSize: XY }}>Y</span>
          </span>
          <span
            className="cyber-title relative z-10"
            style={{ "--c1": SPEARMINT, "--c2": SPEARMINT, fontSize: MEWTWO, color: MEWTWO_PURPLE } as CSSProperties}
          >
            Mewtwo
          </span>
        </div>
      </div>

      <span className="relative z-20 -ml-3 shrink-0 [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.6))]">
        <Sprite src={spriteY} alt="Mega Mewtwo Y" size={SPRITE} />
      </span>
    </div>
  );
}
