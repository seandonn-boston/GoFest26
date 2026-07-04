"use client";

import { useState } from "react";
import { TYPE_COLORS, typeIconUrl } from "@/data/typeVisuals";

/** Real game-style type symbol; if the asset fails, a dot in the type's colour
 *  bearing its initial stands in (no emoji anywhere). */
export function TypeIcon({ type, size = 24 }: { type: string; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    const color = TYPE_COLORS[type.toLowerCase()] ?? "#6b7280";
    return (
      <span
        title={type}
        aria-label={type}
        className="inline-flex items-center justify-center rounded-full font-bold uppercase text-black/80"
        style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.55, lineHeight: 1 }}
      >
        {type.slice(0, 1)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeIconUrl(type)}
      alt={type}
      title={type}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className="rounded-full"
    />
  );
}
