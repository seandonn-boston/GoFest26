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

/** Diagonal (top-left → bottom-right) split of N colors into equal bands. Two
 *  types give the classic 50/50 split; a cross-species group's union (e.g.
 *  Psychic/Steel/Ghost for Solgaleo & Lunala) splits into thirds. */
function diagonalBands(cols: string[]): string {
  const step = 100 / cols.length;
  const stops = cols.map((c, i) => `${c} ${(i * step).toFixed(2)}% ${((i + 1) * step).toFixed(2)}%`).join(", ");
  return `linear-gradient(45deg, ${stops})`;
}

/**
 * Glossy enamel background matching the Pokémon's type. Dual types get a hard
 * diagonal split running top-left → bottom-right: the first type fills the
 * bottom-left triangle, the second the top-right. A combined card with more than
 * two types (Solgaleo & Lunala) bands all of them. The highlight and shade are
 * blended into the color via background-blend-mode so the layers integrate.
 */
export function typeBackgroundStyle(types?: string[]): CSSProperties {
  const cols = (types ?? []).map((t) => TYPE_COLORS[t.toLowerCase()] ?? "#6b7280");
  const base = cols[0] ?? "#3a3f55";
  if (cols.length >= 2) {
    return {
      backgroundColor: base,
      backgroundImage: `${ENAMEL_HILITE}, ${ENAMEL_SHADE}, ${diagonalBands(cols)}`,
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

// A card's content panel: the Pokémon's type color under a dark scrim — so the
// card is themed by its type (no generic purple base) while staying dark enough
// for white text to remain legible on any type.
const PANEL_SCRIM = "linear-gradient(rgba(9,11,18,0.80), rgba(9,11,18,0.86))";

export function typePanelStyle(types?: string[]): CSSProperties {
  const cols = (types ?? []).map((t) => TYPE_COLORS[t.toLowerCase()] ?? "#6b7280");
  const base = cols[0] ?? "#3a3f55";
  if (cols.length >= 2) {
    return {
      backgroundColor: base,
      backgroundImage: `${PANEL_SCRIM}, ${diagonalBands(cols)}`,
    };
  }
  return { backgroundColor: base, backgroundImage: PANEL_SCRIM };
}

// Game-accurate type symbols (recreations of the modern-game type icons).
const TYPE_ICON_BASE = "https://raw.githubusercontent.com/partywhale/pokemon-type-icons/master/icons/";

export function typeIconUrl(type: string): string {
  return `${TYPE_ICON_BASE}${type.toLowerCase()}.svg`;
}
