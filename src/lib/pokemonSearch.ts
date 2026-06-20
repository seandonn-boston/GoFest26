/**
 * Reduces a roster/attacker name to the bare species term you'd type into
 * Pokémon GO's search bar — Pokémon GO can't search variant words, so we drop
 * every qualifier: Shadow, Mega, Primal, regional forms (Galarian / Alolan /
 * Hisuian / Paldean), Forme prefixes, parentheticals, and the Mewtwo X/Y suffix.
 * What remains is the plain species ("Shadow Swampert" → "Swampert", "Galarian
 * Darmanitan" → "Darmanitan"); the user picks the right variant themselves.
 * Commas join as "or", so a deduped list surfaces everything at once.
 */
export function pokemonSearchName(name: string): string {
  let s = name.trim();
  // Strip leading variant qualifiers (a loop in case any ever stack).
  const lead = /^(mega|primal|shadow|galarian|alolan|hisuian|paldean|crowned|dynamax|gigantamax)\s+/i;
  while (lead.test(s)) s = s.replace(lead, "");
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

/**
 * Mega-evolution search string: a comma-joined ("or") species list with
 * `& mega3-4` appended so Pokémon GO surfaces your Mega-Level-3 AND Mega-Level-4
 * (Super Max) specimens of those species — both levels grant the same-type Candy
 * XL boost. Species names only — no forms, types, or pre-evolutions.
 */
export function buildMegaSearchString(species: string[]): string {
  const list = buildSearchString(species);
  return list ? `${list} & mega3-4` : "";
}
