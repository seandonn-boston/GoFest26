/**
 * Short, single-line title for a selection tile. Keeps the full `boss.name`
 * everywhere else (cards, exports) but trims it down so tiles stay one line on
 * mobile:
 *   - drops the leading word "Mega" (except Mega Mewtwo X / Y),
 *   - abbreviates Formes to a single letter (Incarnate I, Therian T, Altered A,
 *     Origin O, Hero H),
 *   - drops the "(all …)" qualifier from Deoxys / Genesect.
 */
const FORME_ABBR: Record<string, string> = {
  incarnate: "I",
  therian: "T",
  altered: "A",
  origin: "O",
  hero: "H",
};

export function tileTitle(boss: { id: string; name: string }): string {
  let name = boss.name;

  // Drop the leading "Mega" — but keep it for the Mewtwo headliners.
  if (boss.id !== "mega-mewtwo-x" && boss.id !== "mega-mewtwo-y") {
    name = name.replace(/^Mega\s+/, "");
  }

  // "Origin Forme Dialga" -> "Dialga O"
  const forme = name.match(/^(Origin|Altered|Incarnate|Therian|Hero)\s+Forme\s+(.+)$/i);
  if (forme) {
    return `${forme[2].trim()} ${FORME_ABBR[forme[1].toLowerCase()]}`;
  }

  // "Name (inner)" — Formes in parentheses.
  const paren = name.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (paren) {
    const base = paren[1].trim();
    const inner = paren[2].trim();
    if (/^all\b/i.test(inner)) return base; // "all Formes" / "all Drive Formes"
    if (/hero/i.test(inner)) return `${base} H`; // "Hero of Many Battles"
    const abbr = inner.split(/\s*&\s*/).map((p) => {
      const key = p.trim().toLowerCase().split(/\s+/)[0];
      return FORME_ABBR[key] ?? p.trim().charAt(0).toUpperCase();
    });
    return `${base} ${abbr.join("/")}`;
  }

  return name;
}

/**
 * Short tile title for a fusion / crowned / primal SOURCE raid (e.g. the
 * `source` on an EnergyGoalDef — "White Kyurem", "Primal Kyogre"). The forme
 * prefix collapses to its first letter ("Primal Kyogre" → "P Kyogre"), with a
 * two-letter fallback where a single initial would collide within the same base
 * species (Necrozma's "Dawn Wings" vs "Dusk Mane" both start "D"). The set of
 * sources is small and fixed, so a lookup keeps it unambiguous and testable.
 */
const SOURCE_ABBR: Record<string, string> = {
  "White Kyurem": "W Kyurem",
  "Black Kyurem": "B Kyurem",
  "Dawn Wings Necrozma": "DW Necrozma",
  "Dusk Mane Necrozma": "DM Necrozma",
  "Crowned Sword Zacian": "C Zacian",
  "Crowned Shield Zamazenta": "C Zamazenta",
  "Primal Groudon": "P Groudon",
  "Primal Kyogre": "P Kyogre",
};

export function tileTitleForSource(source: string): string {
  if (SOURCE_ABBR[source]) return SOURCE_ABBR[source];
  // Generic fallback: first letter of the prefix + the trailing base species word.
  const parts = source.trim().split(/\s+/);
  if (parts.length < 2) return source;
  const base = parts[parts.length - 1];
  return `${parts[0].charAt(0).toUpperCase()} ${base}`;
}
