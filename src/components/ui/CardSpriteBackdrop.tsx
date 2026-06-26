"use client";

import { Sprite } from "@/components/ui/Sprite";

export interface TitleSprite {
  src?: string;
  alt: string;
}

const SIZE = 138; // one size for every sprite — no per-sprite fill/scale tricks

/**
 * The card's sprite(s), behind the content. Nothing fancy: sprite #1 flush to the
 * left edge, sprite #2 flush to the right edge, both at the same size. Anchoring
 * the right sprite with `right` (not a left %) leaves it plenty of room, so it
 * renders full-size with no width/clip/mask workarounds.
 */
export function CardSpriteBackdrop({ sprites }: { sprites: TitleSprite[] }) {
  const left = sprites[0];
  const right = sprites[1];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {left?.src ? (
        <span className="absolute left-0 top-1/2 -translate-y-1/2">
          <Sprite src={left.src} alt="" size={SIZE} />
        </span>
      ) : null}
      {right?.src ? (
        <span className="absolute right-0 top-1/2 -translate-y-1/2">
          <Sprite src={right.src} alt="" size={SIZE} />
        </span>
      ) : null}
    </div>
  );
}
