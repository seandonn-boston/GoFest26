"use client";

import { Sprite } from "@/components/ui/Sprite";

export interface TitleSprite {
  src?: string;
  alt: string;
}

const dropShadow = "[filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.55))]";
const SIZE = 138; // 150% — large enough to clip within a collapsed card
// The addressable `pm*.icon.png` set carries ~30% transparent padding, so its
// subject renders much smaller than a tightly-cropped legacy `pokemon_icon_*` at
// the same box. Scale addressable icons up so every form reads the same size.
const ADDRESSABLE_SCALE = 1.4;
const sizeFor = (src?: string) => (src && src.includes("Addressable") ? Math.round(SIZE * ADDRESSABLE_SCALE) : SIZE);

/**
 * The card's hero sprite(s) as a backdrop layer that fills the (always-present)
 * card HEADER and is vertically CENTERED in it — i.e. centered in the collapsed
 * card height. Because the header never resizes, the sprite stays put when the
 * card opens/closes; the card's overflow-hidden crops any overflow while
 * collapsed, and expanding reveals more of the sprite's bottom.
 *
 * ONE shared system for every card: sprite #1 sits at left-25%, sprite #2 at
 * right-25% — identical sizing/positioning, mirrored only in alignment. A card
 * shows one or two sprites depending on the species.
 */
export function CardSpriteBackdrop({ sprites }: { sprites: TitleSprite[] }) {
  const left = sprites[0];
  const right = sprites[1];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {left?.src ? (
        <span className={`absolute left-1/4 top-1/2 -translate-x-1/2 -translate-y-1/2 ${dropShadow}`}>
          <Sprite src={left.src} alt="" size={sizeFor(left.src)} />
        </span>
      ) : null}
      {right?.src ? (
        <span className={`absolute left-3/4 top-1/2 -translate-x-1/2 -translate-y-1/2 ${dropShadow}`}>
          <Sprite src={right.src} alt="" size={sizeFor(right.src)} />
        </span>
      ) : null}
    </div>
  );
}
