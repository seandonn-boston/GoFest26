"use client";

import { useState } from "react";
import { useSpriteScale } from "./SpriteScaleProvider";

/**
 * A tile's Pokémon sprite, sized to fill the tile. It's an absolutely-positioned
 * layer (so the title can overlap it) and scales so the *largest* sprite in the
 * set reaches 90% of the tile's width or height — whichever it hits first — with
 * every other sprite scaled by that same ratio (see SpriteScaleProvider).
 */
export function TileSprite({ src, alt }: { src?: string; alt: string }) {
  const scale = useSpriteScale();
  const [failed, setFailed] = useState(false);
  const rel = src && scale ? scale.relativeFor(src) : 1;
  const pct = `${(90 * rel).toFixed(2)}%`;

  if (!src || failed) {
    return (
      <span className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
        <span className="flex h-1/2 w-1/2 items-center justify-center rounded-full bg-white/10 text-lg font-semibold text-slate-300">
          {alt.replace(/^Mega\s+/, "").charAt(0)}
        </span>
      </span>
    );
  }

  return (
    <span className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={(e) => {
          const el = e.currentTarget;
          const d = Math.max(el.naturalWidth, el.naturalHeight);
          if (d > 0 && scale) scale.register(src, d);
        }}
        onError={() => setFailed(true)}
        style={{ maxWidth: pct, maxHeight: pct }}
        className="object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.55)]"
      />
    </span>
  );
}
