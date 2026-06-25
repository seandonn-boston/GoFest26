"use client";

import { Sprite } from "@/components/ui/Sprite";

// Matches MewtwoTitle: purple fill (#8E7CC3) + the CSS glitch.
const PURPLE = "#8E7CC3";
const XY = "7.7rem"; // big "X Y" letters — +40% over the old 5.5rem
const SIZE = 138; // sprite box, same as every other card
const dropShadow = "[filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.6))]";

/**
 * Mewtwo-only backdrop, in two z-layers behind the card text:
 *  - z-0 (back): the big "X Y" glitch letters, centered.
 *  - z-10 (middle): the Mega Mewtwo X sprite at 20% from the left and Y at 20%
 *    from the right, centered vertically.
 * The card's "Mewtwo" wordmark / header text sits ABOVE both (z-20 in MewtwoCard).
 */
export function MewtwoBackdrop({ spriteX, spriteY }: { spriteX?: string; spriteY?: string }) {
  return (
    <>
      {/* Back — the X Y letters. */}
      <div aria-hidden className="absolute inset-0 z-0 flex items-center justify-center gap-[2px]">
        <span className="mewtwo-xy" style={{ color: PURPLE, fontSize: XY }}>X</span>
        <span className="mewtwo-xy relative left-[2px]" style={{ color: PURPLE, fontSize: XY }}>Y</span>
      </div>
      {/* Middle — the two sprites: X at 20% from the left, Y at 20% from the right. */}
      <div aria-hidden className="absolute inset-0 z-10">
        <span
          className={`absolute left-[20%] top-1/2 -translate-x-1/2 -translate-y-1/2 ${dropShadow}`}
          style={{ width: SIZE, height: SIZE }}
        >
          <Sprite src={spriteX} alt="" size={SIZE} />
        </span>
        <span
          className={`absolute left-[80%] top-1/2 -translate-x-1/2 -translate-y-1/2 ${dropShadow}`}
          style={{ width: SIZE, height: SIZE }}
        >
          <Sprite src={spriteY} alt="" size={SIZE} />
        </span>
      </div>
    </>
  );
}
