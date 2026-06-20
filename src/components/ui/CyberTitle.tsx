import type { CSSProperties } from "react";
import { TYPE_COLORS } from "@/data/typeVisuals";

/**
 * Avant-garde cyberpunk card title: the species name in the display font with a
 * chromatic-split glitch (like the masthead) tinted to the Pokémon's TYPE colors
 * — both hues for a dual type, one (echoed) for a single type.
 */
export function CyberTitle({ name, types, className = "" }: { name: string; types?: string[]; className?: string }) {
  const cols = (types ?? []).map((t) => TYPE_COLORS[t.toLowerCase()]).filter(Boolean);
  const style = {
    "--c1": cols[0] ?? "var(--neon-magenta)",
    "--c2": cols[1] ?? cols[0] ?? "var(--neon-cyan)",
  } as CSSProperties;
  return (
    <h3 className={`cyber-title ${className}`} style={style}>
      {name}
    </h3>
  );
}
