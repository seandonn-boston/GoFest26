"use client";

import { Sprite } from "@/components/ui/Sprite";

export interface TitleSprite {
  src?: string;
  alt: string;
}

const dropShadow = "[filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.55))]";
const SIZE = 184; // backdrop sprite — large enough to clip at the bottom of a collapsed card
const STACK_SIZE = 208; // fused formes (wide-short canvas) sized up to match
const STACK_OFFSET = 14; // px each fused forme is nudged from centre (diagonal spread)

/**
 * The card's hero sprite(s) as a backdrop layer: anchored FLUSH to the top of the
 * card and sitting behind every bit of content (but above the card's background).
 * The card itself (overflow-hidden) does the clipping, so a collapsed card crops
 * only the BOTTOM of the sprite and an expanded card reveals the whole asset.
 *
 * A lone boss centres one sprite behind the title; a two-forme species pins one
 * to the top-left and one to the top-right; `rightStack` stacks two fused formes
 * (Kyurem / Necrozma) at the top-right beside the base sprite on the left.
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
  const single = !!left?.src && !right?.src && !hasStack;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0">
      {/* Left / single sprite — flush with the card top. */}
      {left?.src ? (
        <span className={`absolute top-0 ${single ? "left-1/2 -translate-x-1/2" : "left-0"} ${dropShadow}`}>
          <Sprite src={left.src} alt="" size={SIZE} />
        </span>
      ) : null}

      {hasStack ? (
        <span className="absolute right-0 top-0" style={{ width: STACK_SIZE, height: STACK_SIZE }}>
          <span
            className={`absolute left-1/2 top-1/2 ${dropShadow}`}
            style={{ transform: `translate(calc(-50% + ${STACK_OFFSET}px), calc(-50% - ${STACK_OFFSET}px))` }}
          >
            <Sprite src={rightStack![0].src} alt="" size={STACK_SIZE} />
          </span>
          <span
            className={`absolute left-1/2 top-1/2 ${dropShadow}`}
            style={{ transform: `translate(calc(-50% - ${STACK_OFFSET}px), calc(-50% + ${STACK_OFFSET}px))` }}
          >
            <Sprite src={rightStack![1].src} alt="" size={STACK_SIZE} />
          </span>
        </span>
      ) : right?.src ? (
        <span className={`absolute right-0 top-0 ${dropShadow}`}>
          <Sprite src={right.src} alt="" size={SIZE} />
        </span>
      ) : null}
    </div>
  );
}
