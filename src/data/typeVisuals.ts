import type { CSSProperties } from "react";

/** Standard Pokémon type colors. */
export const TYPE_COLORS: Record<string, string> = {
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#6390F0",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
};

/** Emoji pictograph per type (no labels needed). */
export const TYPE_ICONS: Record<string, string> = {
  normal: "⭐",
  fire: "🔥",
  water: "💧",
  electric: "⚡",
  grass: "🍃",
  ice: "❄️",
  fighting: "🥊",
  poison: "☠️",
  ground: "⛰️",
  flying: "🪶",
  psychic: "🔮",
  bug: "🐛",
  rock: "🪨",
  ghost: "👻",
  dragon: "🐲",
  dark: "🌙",
  steel: "⚙️",
  fairy: "✨",
};

// Glossy enamel layers blended *into* the color (not overlaid as a flat film):
// a soft-light highlight (domed sheen) + a multiplied bottom shade.
const ENAMEL_HILITE =
  "radial-gradient(95% 62% at 32% 0%, rgba(255,255,255,0.92), rgba(255,255,255,0.18) 34%, rgba(255,255,255,0) 62%)";
const ENAMEL_SHADE =
  "radial-gradient(150% 125% at 50% 130%, rgba(0,0,0,0.78), rgba(0,0,0,0) 60%)";

/**
 * Glossy enamel background matching the Pokémon's type. Dual types get a hard
 * diagonal split (top-right → bottom-left). The highlight and shade are blended
 * into the color via background-blend-mode so the layers integrate naturally.
 */
export function typeBackgroundStyle(types?: string[]): CSSProperties {
  const cols = (types ?? []).map((t) => TYPE_COLORS[t.toLowerCase()] ?? "#6b7280");
  const base = cols[0] ?? "#3a3f55";
  if (cols.length >= 2) {
    return {
      backgroundColor: base,
      backgroundImage: `${ENAMEL_HILITE}, ${ENAMEL_SHADE}, linear-gradient(135deg, ${cols[0]} 0 50%, ${cols[1]} 50% 100%)`,
      backgroundBlendMode: "soft-light, multiply, normal",
    };
  }
  return {
    backgroundColor: base,
    backgroundImage: `${ENAMEL_HILITE}, ${ENAMEL_SHADE}`,
    backgroundBlendMode: "soft-light, multiply",
  };
}

export function typeIconList(types?: string[]): string[] {
  return (types ?? []).map((t) => TYPE_ICONS[t.toLowerCase()] ?? "❔");
}

// Game-accurate type symbols (recreations of the modern-game type icons).
const TYPE_ICON_BASE = "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/master/icons/";

export function typeIconUrl(type: string): string {
  return `${TYPE_ICON_BASE}${type.toLowerCase()}.svg`;
}
