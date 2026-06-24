"use client";

import { Sprite } from "@/components/ui/Sprite";
import { CyberTitle } from "@/components/ui/CyberTitle";

export interface TitleSprite {
  src?: string;
  alt: string;
}

/** Small uppercase pre-title (e.g. "Mega"), echoing the Mewtwo hero title. */
function Pretitle({ text }: { text: string }) {
  return (
    <span className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-slate-300 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)]">
      {text}
    </span>
  );
}

const dropShadow = "[filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.55))]";
const SPRITE = 60; // flanking sprite size, mirroring the Mewtwo hero title

/**
 * The hero card title — sprite(s) flanking a CENTERED name, positioned exactly
 * like the Mega Mewtwo X / Y sprites on the Mewtwo card: tucked close on the left
 * and right, slightly overlapping the title, the whole cluster centered (≤350px).
 * A two-forme species shows both sprites (X / Y slots); a lone boss fills the
 * right slot with an invisible, same-size spacer so the name stays at the card's
 * true center regardless of the sprite. Mega bosses get a centered "Mega" pre-title.
 */
export function CardTitle({
  name,
  types,
  sprites,
  isMega,
  pretitle: pretitleProp,
}: {
  name: string;
  types?: string[];
  sprites: TitleSprite[];
  isMega?: boolean;
  /** Overrides the small pre-title (e.g. "Altered & Origin" for a forme group). */
  pretitle?: string;
}) {
  const displayName = name.replace(/^Mega\s+/, "");
  const pretitle = pretitleProp ?? (isMega ? "Mega" : null);
  const left = sprites[0];
  const right = sprites[1]; // undefined for a single boss

  return (
    <div className="mx-auto flex max-w-[350px] items-center justify-center">
      {/* Left slot — Mega Mewtwo X position. */}
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

      {/* Right slot — Mega Mewtwo Y position; an invisible spacer when there's no
          second forme, so the name stays centered. */}
      {right?.src ? (
        <span className={`relative z-20 -ml-3 shrink-0 ${dropShadow}`}>
          <Sprite src={right.src} alt={right.alt} size={SPRITE} />
        </span>
      ) : (
        <span className="-ml-3 shrink-0" style={{ width: SPRITE, height: SPRITE }} aria-hidden />
      )}
    </div>
  );
}
