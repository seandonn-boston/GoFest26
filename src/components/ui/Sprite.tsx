"use client";

import { useState } from "react";

/**
 * Renders a Pokémon GO sprite icon. Falls back to a typed-looking placeholder
 * if the image is missing or fails to load (e.g. CDN hotlink blocked).
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
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
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
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className="shrink-0 object-contain drop-shadow"
    />
  );
}
