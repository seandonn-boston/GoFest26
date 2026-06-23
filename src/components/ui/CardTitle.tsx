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

/**
 * The hero card title — the sprite-plus-chromatic-title treatment Mewtwo has,
 * generalised to every boss (using the type-tinted CyberTitle glitch, not the
 * green Mewtwo one). Mega bosses get a "Mega" pre-title; 5★ bosses get none.
 * One sprite → sprite on the left of the title; a shared two-forme species
 * (Solgaleo + Lunala) → the two sprites flank a centered title, Mewtwo-style.
 */
export function CardTitle({
  name,
  types,
  sprites,
  isMega,
}: {
  name: string;
  types?: string[];
  sprites: TitleSprite[];
  isMega?: boolean;
}) {
  const displayName = name.replace(/^Mega\s+/, "");
  const pretitle = isMega ? "Mega" : null;

  if (sprites.length > 1) {
    return (
      <div className="flex items-center justify-center gap-1.5">
        <span className={`shrink-0 ${dropShadow}`}>
          <Sprite src={sprites[0].src} alt={sprites[0].alt} size={56} />
        </span>
        <div className="flex min-w-0 flex-col items-center text-center">
          {pretitle ? <Pretitle text={pretitle} /> : null}
          <CyberTitle name={displayName} types={types} className="text-2xl" />
        </div>
        <span className={`shrink-0 ${dropShadow}`}>
          <Sprite src={sprites[1].src} alt={sprites[1].alt} size={56} />
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2.5">
      <span className={`shrink-0 ${dropShadow}`}>
        <Sprite src={sprites[0]?.src} alt={sprites[0]?.alt ?? displayName} size={52} />
      </span>
      <div className="flex min-w-0 flex-col items-start">
        {pretitle ? <Pretitle text={pretitle} /> : null}
        <CyberTitle name={displayName} types={types} className="text-2xl" />
      </div>
    </div>
  );
}
