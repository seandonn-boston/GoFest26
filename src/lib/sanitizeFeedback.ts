// Sanitizers for the feedback → GitHub issue pipeline. Visitor-typed text is
// untrusted: beyond ordinary noise we strip the characters used to smuggle
// hidden instructions past a human reviewer (or an AI agent triaging issues) —
// zero-width characters, bidi overrides, and C0/C1 controls that render as
// nothing but survive copy-paste.
//
// Written as \u escapes on purpose: literal invisibles in source would be
// unreviewable — the very problem this module exists to prevent.
const HIDDEN_CHARS = new RegExp(
  "[" +
    "\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F" + // C0/C1 controls (keep \n, \r handled separately, \t)
    "\\u200B-\\u200F" + // zero-width space/joiners, LRM/RLM
    "\\u202A-\\u202E" + // bidi embedding/overrides
    "\\u2060-\\u2064" + // word joiner, invisible operators
    "\\u2066-\\u2069" + // bidi isolates
    "\\uFEFF" + // zero-width no-break space / BOM
    "]",
  "g",
);

/** One visible line: hidden chars stripped, whitespace flattened, length-capped. */
export function sanitizeLine(text: string, max: number): string {
  return text.replace(HIDDEN_CHARS, "").replace(/\s+/g, " ").trim().slice(0, max).trim();
}

/** A multi-line block: hidden chars stripped, newlines kept, length-capped. */
export function sanitizeBlock(text: string, max: number): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(HIDDEN_CHARS, "")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .trim()
    .slice(0, max)
    .trim();
}
