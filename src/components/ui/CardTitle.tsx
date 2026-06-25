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
const SPRITE = 60; // base flanking-sprite size
// The sprites now sit BEHIND the title as enlarged hero art. "200% bigger" =
// ×3 the base size; a single constant so it's a one-line tune.
const BG_SCALE = 3;
const BIG = SPRITE * BG_SCALE; // 180 — a single flank sprite, behind the text
// Fused-forme icons (White/Black Kyurem, Dawn Wings/Dusk Mane Necrozma) have
// wide-short canvases, so object-contain renders them smaller; size them up first.
const STACK_BASE = 80;
const BIG_STACK = STACK_BASE * BG_SCALE; // 240 — each stacked fused forme
const STACK_OFFSET = 12 * BG_SCALE; // px each fused forme is nudged from centre

/**
 * The hero card title — the species name (and its forme pre-title) CENTERED, with
 * the boss's sprite(s) enlarged and tucked BEHIND the text (lower z-index than
 * both the name and the pre-title) as backdrop art. The sprites overflow their
 * slots and are masked to the title's bounding box (`overflow-hidden`). A single
 * boss shows one sprite behind the left of the name; a two-forme species shows
 * both (left + right); `rightStack` puts TWO fused formes behind the right
 * (Kyurem / Necrozma). Mega bosses get a "Mega" pre-title.
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
  /** Two fused formes stacked behind the right of the title (base on the left). */
  rightStack?: TitleSprite[];
}) {
  const displayName = name.replace(/^Mega\s+/, "");
  const pretitle = pretitleProp ?? (isMega ? "Mega" : null);
  const left = sprites[0];
  const right = sprites[1]; // undefined for a single boss

  return (
    <div className="relative mx-auto flex max-w-[350px] items-center justify-center overflow-hidden">
      {/* Left sprite — enlarged, BEHIND the title (z-0), masked to the title box. */}
      {left?.src ? (
        <span
          aria-hidden
          className={`pointer-events-none absolute left-0 top-1/2 z-0 -translate-x-1/3 -translate-y-1/2 ${dropShadow}`}
        >
          <Sprite src={left.src} alt="" size={BIG} />
        </span>
      ) : null}

      {/* Right side — two stacked fused formes, or a single right forme; behind
          the title (z-0), tucked toward the right edge and clipped to the box. */}
      {rightStack && rightStack.length >= 2 ? (
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-1/2 z-0"
          style={{ width: BIG_STACK, height: BIG_STACK, transform: "translate(33%, -50%)" }}
        >
          <span
            className={`absolute left-1/2 top-1/2 ${dropShadow}`}
            style={{ transform: `translate(calc(-50% + ${STACK_OFFSET}px), calc(-50% - ${STACK_OFFSET}px))` }}
          >
            <Sprite src={rightStack[0].src} alt="" size={BIG_STACK} />
          </span>
          <span
            className={`absolute left-1/2 top-1/2 ${dropShadow}`}
            style={{ transform: `translate(calc(-50% - ${STACK_OFFSET}px), calc(-50% + ${STACK_OFFSET}px))` }}
          >
            <Sprite src={rightStack[1].src} alt="" size={BIG_STACK} />
          </span>
        </span>
      ) : right?.src ? (
        <span
          aria-hidden
          className={`pointer-events-none absolute right-0 top-1/2 z-0 translate-x-1/3 -translate-y-1/2 ${dropShadow}`}
        >
          <Sprite src={right.src} alt="" size={BIG} />
        </span>
      ) : null}

      {/* Title — name + pre-title, ABOVE the sprites (higher z-index). */}
      <div className="relative z-10 flex min-w-0 flex-col items-center px-2 text-center">
        {pretitle ? <Pretitle text={pretitle} /> : null}
        <CyberTitle name={displayName} types={types} className="text-2xl" />
      </div>
    </div>
  );
}
