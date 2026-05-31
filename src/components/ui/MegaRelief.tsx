"use client";

import { useEffect, useState } from "react";
import { getMegaSymbolMask } from "./megaSymbol";
import { MegaGlyph } from "./MegaGlyph";

/**
 * The Mega Evolution emblem embossed as a relief behind a mega sprite. Uses the
 * real symbol silhouette (extracted client-side) masked over a light/dark
 * gradient and blended into the tile so it reads as carved metal. Falls back to
 * the vector glyph while loading or if the image can't be fetched.
 */
export function MegaRelief() {
  const [mask, setMask] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getMegaSymbolMask().then((m) => {
      if (active) setMask(m);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!mask) {
    return (
      <MegaGlyph className="pointer-events-none absolute bottom-[2px] left-1/2 top-[2px] z-[1] -translate-x-1/2 text-white/30 [aspect-ratio:1/1]" />
    );
  }

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-[2px] left-1/2 top-[2px] z-[1] -translate-x-1/2 [aspect-ratio:1/1]"
      style={{
        WebkitMaskImage: `url(${mask})`,
        maskImage: `url(${mask})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        backgroundImage:
          "linear-gradient(155deg, rgba(255,255,255,0.65), rgba(255,255,255,0) 40%, rgba(0,0,0,0.55))",
        mixBlendMode: "overlay",
        filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.35)) drop-shadow(0 -1px 0 rgba(255,255,255,0.3))",
      }}
    />
  );
}
