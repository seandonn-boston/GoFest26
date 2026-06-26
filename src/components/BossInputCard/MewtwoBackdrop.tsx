"use client";

// Matches MewtwoTitle: purple fill (#8E7CC3) + the CSS glitch.
const PURPLE = "#8E7CC3";
const XY = "7.7rem"; // big "X Y" letters — +40% over the old 5.5rem

/**
 * Mewtwo-only backdrop, in two z-layers behind the card text:
 *  - z-0 (back): the big "X Y" glitch letters, centered.
 *  - z-10 (middle): the Mega Mewtwo X sprite 20% in from the left and Y 20% in
 *    from the right, each at the FULL height of the (closed) card, grown
 *    proportionally (h-full + w-auto), position fixed.
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
      {/* Middle — sprites at full closed-card height, 20% in from each edge. */}
      <div aria-hidden className="absolute inset-0 z-10">
        {spriteX ? (
          // X centered on the 20%-from-left mark.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={spriteX} alt="" className="absolute left-[20%] top-0 h-full w-auto -translate-x-1/2 object-contain" />
        ) : null}
        {spriteY ? (
          // Y centered on the 20%-from-right (80%-from-left) mark.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={spriteY} alt="" className="absolute left-[80%] top-0 h-full w-auto -translate-x-1/2 object-contain" />
        ) : null}
      </div>
    </>
  );
}
