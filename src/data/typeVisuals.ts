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

/**
 * Background that matches the Pokémon's type. Dual types get a hard diagonal
 * split with the dividing line running top-right → bottom-left (primary type
 * fills the top-left triangle).
 */
export function typeBackgroundStyle(types?: string[]): CSSProperties {
  const cols = (types ?? []).map((t) => TYPE_COLORS[t.toLowerCase()] ?? "#6b7280");
  if (cols.length === 0) return { backgroundColor: "#3a3f55" };
  if (cols.length === 1) return { backgroundColor: cols[0] };
  return { backgroundImage: `linear-gradient(135deg, ${cols[0]} 0 50%, ${cols[1]} 50% 100%)` };
}

export function typeIconList(types?: string[]): string[] {
  return (types ?? []).map((t) => TYPE_ICONS[t.toLowerCase()] ?? "❔");
}
