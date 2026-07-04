"use client";

import { useState } from "react";
import { ITEM_ICONS, type ItemIconName } from "@/data/itemIcons";

/**
 * Small inline in-game item icon (Rare Candy, Stardust, raid passes) from the
 * PokeMiners CDN — real game artwork where the UI used to show an emoji.
 * Decorative by default; pass `title` to expose it to assistive tech.
 */
export function ItemIcon({
  name,
  size = 16,
  className,
  title,
}: {
  name: ItemIconName;
  /** Rendered height in px (width scales to the art's aspect). */
  size?: number;
  className?: string;
  title?: string;
}) {
  // If the CDN fetch fails (offline), vanish rather than show a broken image —
  // the surrounding text always carries the meaning on its own.
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ITEM_ICONS[name]}
      alt={title ?? ""}
      title={title}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      style={{ height: size, width: "auto" }}
      className={className ? `inline-block align-[-0.18em] ${className}` : "inline-block align-[-0.18em]"}
      aria-hidden={title ? undefined : true}
    />
  );
}
