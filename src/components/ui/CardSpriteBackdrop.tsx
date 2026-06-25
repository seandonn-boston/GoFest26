"use client";

import { Sprite } from "@/components/ui/Sprite";

export interface TitleSprite {
  src?: string;
  alt: string;
}

const dropShadow = "[filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.55))]";
const SIZE = 138; // 150% — large enough to clip within a collapsed card
// Fused formes: full SIZE (no shrink), spread 30% apart from the shared origin —
// 15% up-and-right, 15% down-and-left. The %s are of each sprite's own size, so
// they combine with the -50%/-50% centring: x = -50%±15%, y = -50%∓15%.
const UP_RIGHT = "translate(-35%, -65%)";
const DOWN_LEFT = "translate(-65%, -35%)";

/**
 * The card's hero sprite(s) as a backdrop layer that fills the (always-present)
 * card HEADER and is vertically CENTERED in it — i.e. centered in the collapsed
 * card height. Because the header never changes size, the sprite stays put when
 * the card opens/closes; the card's overflow-hidden crops any overflow on all
 * four sides while collapsed, and expanding reveals more of the sprite's bottom.
 *
 * Positions: a lone boss / left forme at left-25%; a second forme (or single
 * fused/primal) at right-25%; the two fused formes (Kyurem / Necrozma) cluster at
 * the same left-25% origin, spread diagonally.
 */
export function CardSpriteBackdrop({
  sprites,
  rightStack,
}: {
  sprites: TitleSprite[];
  rightStack?: TitleSprite[];
}) {
  const left = sprites[0];
  const right = sprites[1];
  const hasStack = !!(rightStack && rightStack.length >= 2);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* Base / single / left forme — left 25%, centered vertically. */}
      {left?.src ? (
        <span className={`absolute left-1/4 top-1/2 -translate-x-1/2 -translate-y-1/2 ${dropShadow}`}>
          <Sprite src={left.src} alt="" size={SIZE} />
        </span>
      ) : null}

      {hasStack ? (
        // Two fused formes — same left-25% origin as the base, diagonally spread.
        <span
          className="absolute left-1/4 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: SIZE, height: SIZE }}
        >
          <span className={`absolute left-1/2 top-1/2 ${dropShadow}`} style={{ transform: UP_RIGHT }}>
            <Sprite src={rightStack![0].src} alt="" size={SIZE} />
          </span>
          <span className={`absolute left-1/2 top-1/2 ${dropShadow}`} style={{ transform: DOWN_LEFT }}>
            <Sprite src={rightStack![1].src} alt="" size={SIZE} />
          </span>
        </span>
      ) : right?.src ? (
        // Second forme / single fused / primal — right 25%.
        <span className={`absolute left-3/4 top-1/2 -translate-x-1/2 -translate-y-1/2 ${dropShadow}`}>
          <Sprite src={right.src} alt="" size={SIZE} />
        </span>
      ) : null}
    </div>
  );
}
