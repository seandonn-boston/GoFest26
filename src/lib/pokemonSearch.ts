/**
 * Reduces a roster name to the species term you'd type into Pokémon GO's search
 * bar — drops "Mega", Forme qualifiers, parentheticals, and the Mewtwo X/Y
 * suffix. Pokémon GO search treats commas as "or", so a comma-joined list of
 * these surfaces all your targets at once.
 */
export function pokemonSearchName(name: string): string {
  let s = name;
  s = s.replace(/^Mega\s+/i, "");
  s = s.replace(/^(Origin|Altered|Incarnate|Therian|Hero)\s+Forme\s+/i, "");
  s = s.replace(/\s*\(.*\)\s*$/, ""); // drop "(Origin)", "(Hero of Many Battles)", etc.
  s = s.replace(/\s+[XY]$/, ""); // Mewtwo X / Y
  return s.trim();
}

/**
 * Normalized species key for matching a screenshot's label species to a roster
 * boss (e.g. "Mega Tyranitar" -> "tyranitar", "Ho-Oh" -> "hooh").
 */
export function speciesKey(name: string): string {
  return pokemonSearchName(name).toLowerCase().replace(/[^a-z]/g, "");
}

/** Deduped, comma-joined Pokémon GO search string for a set of names. */
export function buildSearchString(names: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const term = pokemonSearchName(n);
    const key = term.toLowerCase();
    if (term && !seen.has(key)) {
      seen.add(key);
      out.push(term);
    }
  }
  return out.join(", ");
}
