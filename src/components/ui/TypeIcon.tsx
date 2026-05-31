"use client";

import { useState } from "react";
import { TYPE_ICONS, typeIconUrl } from "@/data/typeVisuals";

/** Real game-style type symbol, with an emoji fallback if the asset fails. */
export function TypeIcon({ type, size = 24 }: { type: string; size?: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span style={{ fontSize: size * 0.72, lineHeight: 1 }} title={type} aria-label={type}>
        {TYPE_ICONS[type.toLowerCase()] ?? "❔"}
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
