"use client";

import { Sprite } from "@/components/ui/Sprite";
import { CARD_SPRITE_SIZE } from "@/components/ui/CardSpriteBackdrop";

const SIZE = CARD_SPRITE_SIZE; // same size as every other card

/**
 * Mewtwo-only backdrop behind the card text: the Mega Mewtwo X / Y sprites (same
 * size as every other card), each centered on the 10%-from-its-side mark so X
 * and Y sit well apart. The big "X Y" glitch letters live in MewtwoTitle (inside
 * the wordmark's reserved box) so they stay centered on MEWTWO at any width.
 * The card's wordmark / header text sits ABOVE this layer (z-20 in MewtwoCard).
 */
export function MewtwoBackdrop({ spriteX, spriteY }: { spriteX?: string; spriteY?: string }) {
  return (
    <div aria-hidden className="absolute inset-0 z-10">
      {spriteX ? (
        <span className="absolute left-[10%] top-[8px] -translate-x-1/2">
          <Sprite src={spriteX} alt="" size={SIZE} />
        </span>
      ) : null}
      {spriteY ? (
        <span className="absolute right-[10%] top-[8px] translate-x-1/2">
          <Sprite src={spriteY} alt="" size={SIZE} />
        </span>
      ) : null}
    </div>
  );
}
