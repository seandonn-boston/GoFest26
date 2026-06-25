"use client";

import { Sprite } from "@/components/ui/Sprite";

export interface TitleSprite {
  src?: string;
  alt: string;
}

const dropShadow = "[filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.55))]";
const SIZE = 138; // 150% — every card sprite renders in this same box, no per-source scaling

/** One sprite, anchored at left-25% or right-25% and centered vertically. The
 *  span carries an EXPLICIT width/height so it isn't shrink-to-fit — otherwise the
 *  right sprite (less room to its right) collapses against `img { max-width:100% }`
 *  and renders ~half size no matter what `size` we pass. */
function BackdropSprite({ sprite, side }: { sprite: TitleSprite; side: "left" | "right" }) {
  return (
    <span
      className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 ${side === "left" ? "left-1/4" : "left-3/4"} ${dropShadow}`}
      style={{ width: SIZE, height: SIZE }}
    >
      <Sprite src={sprite.src} alt="" size={SIZE} />
    </span>
  );
}

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
      {left?.src ? <BackdropSprite sprite={left} side="left" /> : null}
      {right?.src ? <BackdropSprite sprite={right} side="right" /> : null}
    </div>
  );
}
