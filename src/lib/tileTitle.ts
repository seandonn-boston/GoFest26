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
