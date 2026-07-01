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
 * The card's sprite(s), behind the content. Up to three, same size, aligned to the
 * top of the card with an 8px gap: the first sits flush to the left edge, the last
 * flush to the right edge (4px buffer each), and a middle one (a 3-forme species
 * like Kyurem or Necrozma) is centered between them.
 */
export function CardSpriteBackdrop({ sprites }: { sprites: TitleSprite[] }) {
  const list = sprites.filter((s) => s.src).slice(0, 3);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {list.map((s, i) => {
        const pos =
          list.length === 1
            ? "left-[4px]"
            : i === 0
              ? "left-[4px]"
              : i === list.length - 1
                ? "right-[4px]"
                : "left-1/2 -translate-x-1/2";
        return (
          <span key={i} className={`absolute top-[8px] ${pos}`}>
            <Sprite src={s.src} alt="" size={SIZE} />
          </span>
        );
      })}
    </div>
  );
}
