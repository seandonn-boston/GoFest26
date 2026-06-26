"use client";

import { Sprite } from "@/components/ui/Sprite";

export interface TitleSprite {
  src?: string;
  alt: string;
}

/** One size for every card sprite — shared so the Mewtwo card matches exactly. */
export const CARD_SPRITE_SIZE = 138;
const SIZE = CARD_SPRITE_SIZE;

/**
 * The card's sprite(s), behind the content. Nothing fancy: sprite #1's CENTER sits
 * 10% in from the left, sprite #2's center 10% in from the right, both same size.
 * Anchoring the right sprite with `right` (not a left %) leaves it plenty of room,
 * so it renders full-size with no width/clip/mask workarounds.
 */
export function CardSpriteBackdrop({ sprites }: { sprites: TitleSprite[] }) {
  const left = sprites[0];
  const right = sprites[1];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {left?.src ? (
        <span className="absolute left-[10%] top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Sprite src={left.src} alt="" size={SIZE} />
        </span>
      ) : null}
      {right?.src ? (
        <span className="absolute right-[10%] top-1/2 translate-x-1/2 -translate-y-1/2">
          <Sprite src={right.src} alt="" size={SIZE} />
        </span>
      ) : null}
    </div>
  );
}
