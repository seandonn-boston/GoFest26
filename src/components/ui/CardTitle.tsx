"use client";

import { Sprite } from "@/components/ui/Sprite";
import { CyberTitle } from "@/components/ui/CyberTitle";

export interface TitleSprite {
  src?: string;
  alt: string;
}

/** Small uppercase pre-title (e.g. "Mega", "Hero & Crowned"), echoing the Mewtwo
 *  hero title. Long forme lists tighten their tracking so they stay on one line. */
function Pretitle({ text }: { text: string }) {
  const tight = text.length > 20;
  return (
    <span
      className={`font-extrabold uppercase text-slate-300 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)] ${
        tight ? "text-[10px] tracking-[0.12em]" : "text-[11px] tracking-[0.3em]"
      }`}
    >
      {text}
    </span>
  );
}

const dropShadow = "[filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.55))]";
const SPRITE = 60; // flanking sprite size, mirroring the Mewtwo hero title
const STACK_OFFSET = 10; // px each fused forme is nudged from centre (diagonal spread)

/**
 * The hero card title — sprite(s) flanking a CENTERED name, positioned exactly
 * like the Mega Mewtwo X / Y sprites on the Mewtwo card: tucked close on the left
 * and right, slightly overlapping the title, the whole cluster centered (≤350px).
 * A two-forme species shows both sprites (X / Y slots); a lone boss fills the
 * right slot with an invisible, same-size spacer so the name stays at the card's
 * true center regardless of the sprite. `rightStack` puts TWO fused formes in the
 * right slot, vertically stacked and diagonally offset (Kyurem / Necrozma), in the
 * same position a single right sprite would sit. Mega bosses get a "Mega" pre-title.
 */
export function CardTitle({
  name,
  types,
  sprites,
  isMega,
  pretitle: pretitleProp,
  rightStack,
}: {
  name: string;
  types?: string[];
  sprites: TitleSprite[];
  isMega?: boolean;
  /** Overrides the small pre-title (e.g. "Altered & Origin" for a forme group). */
  pretitle?: string;
  /** Two fused formes stacked in the right slot (base on the left). */
  rightStack?: TitleSprite[];
}) {
  const displayName = name.replace(/^Mega\s+/, "");
  const pretitle = pretitleProp ?? (isMega ? "Mega" : null);
  const left = sprites[0];
  const right = sprites[1]; // undefined for a single boss

  return (
    <div className="mx-auto flex max-w-[350px] items-center justify-center">
      {/* Left slot — Mega Mewtwo X position (the base / non-fused sprite). */}
      {left?.src ? (
        <span className={`relative z-20 -mr-3 shrink-0 ${dropShadow}`}>
          <Sprite src={left.src} alt={left.alt ?? displayName} size={SPRITE} />
        </span>
      ) : (
        <span className="-mr-3 shrink-0" style={{ width: SPRITE, height: SPRITE }} aria-hidden />
      )}

      <div className="relative z-10 flex min-w-0 flex-col items-center text-center">
        {pretitle ? <Pretitle text={pretitle} /> : null}
        <CyberTitle name={displayName} types={types} className="text-2xl" />
      </div>

      {/* Right slot — Mega Mewtwo Y position. Two fused formes stack here (top
          nudged down-right, bottom nudged up-left, occupying the single slot);
          else a single forme; else an invisible spacer to keep the name centered. */}
      {rightStack && rightStack.length >= 2 ? (
        <span className="relative -ml-3 shrink-0" style={{ width: SPRITE, height: SPRITE }}>
          {/* Both formes render at full SPRITE size — neither shrinks — and spread
              diagonally from centre so together they occupy more than one slot. */}
          <span
            className={`absolute left-1/2 top-1/2 z-20 ${dropShadow}`}
            style={{ transform: `translate(calc(-50% + ${STACK_OFFSET}px), calc(-50% - ${STACK_OFFSET}px))` }}
          >
            <Sprite src={rightStack[0].src} alt={rightStack[0].alt} size={SPRITE} />
          </span>
          <span
            className={`absolute left-1/2 top-1/2 z-10 ${dropShadow}`}
            style={{ transform: `translate(calc(-50% - ${STACK_OFFSET}px), calc(-50% + ${STACK_OFFSET}px))` }}
          >
            <Sprite src={rightStack[1].src} alt={rightStack[1].alt} size={SPRITE} />
          </span>
        </span>
      ) : right?.src ? (
        <span className={`relative z-20 -ml-3 shrink-0 ${dropShadow}`}>
          <Sprite src={right.src} alt={right.alt} size={SPRITE} />
        </span>
      ) : (
        <span className="-ml-3 shrink-0" style={{ width: SPRITE, height: SPRITE }} aria-hidden />
      )}
    </div>
  );
}
