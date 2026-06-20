"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Renders a Pokémon GO sprite icon. The PokeMiners/Leek Duck CDN names some
 * mons `pm{dex}.icon.png` (modern) and others `pokemon_icon_{dex}_00.png`
 * (legacy), inconsistently — so on a load error we retry the other format
 * before giving up. Falls back to a typed-looking lettered chip if every
 * candidate fails (or there's no src).
 */
export function Sprite({
  src,
  alt,
  size = 48,
}: {
  src?: string;
  alt: string;
  size?: number;
}) {
  // Candidate URLs to try in order: the given one, then the alternate CDN naming.
  const candidates = useMemo(() => {
    if (!src) return [];
    const list = [src];
    const pm = src.match(/pm(\d+)((?:\.f[^.]+)?)\.icon\.png$/);
    if (pm) {
      const dex = pm[1].padStart(3, "0");
      // Only base-form (no fFORM) icons have a reliable legacy _00 equivalent.
      if (!pm[2]) list.push(src.replace(/pm\d+\.icon\.png$/, `pokemon_icon_${dex}_00.png`));
    }
    const legacy = src.match(/pokemon_icon_(\d+)_00\.png$/);
    if (legacy) list.push(src.replace(/pokemon_icon_\d+_00\.png$/, `pm${Number(legacy[1])}.icon.png`));
    return list;
  }, [src]);

  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [src]);

  const current = candidates[idx];
  if (!current) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-slate-300"
        aria-hidden
      >
        {alt.replace(/^Mega\s+/, "").charAt(0)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setIdx((i) => i + 1)}
      style={{ width: size, height: size }}
      className="shrink-0 object-contain drop-shadow"
    />
  );
}
