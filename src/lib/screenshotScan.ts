// Pokémon GO screenshot scanner (v2). Reads the resource grid of a Pokémon
// detail screen with NO layout assumptions: every value is anchored to the gray
// caption label *under* it ("MEWTWO CANDY", "VOLT FUSION ENERGY", "SINNOH
// STONE"), each label independently claims the number directly above it, and
// unlabeled numbers (CP, HP, Power-Up / Evolve / Purify costs, badges) are
// never read. That makes 2- and 3-column layouts, any resource count (Stardust
// + Candy only up to six cells), wrapped labels, scrolled screenshots, and
// partial crops all work the same way.
//
// Label grammar handled:
//   STARDUST
//   <species> CANDY [XL]
//   <species> MEGA ENERGY [X|Y]        (X/Y may wrap to the next line)
//   <species> PRIMAL ENERGY            (Kyogre / Groudon)
//   VOLT|BLAZE FUSION ENERGY           -> implied species Kyurem
//   SOLAR|LUNAR FUSION ENERGY          -> implied species Necrozma
//   CROWNED SWORD|SHIELD ENERGY        -> implied species Zacian / Zamazenta
//   evolution items (Sinnoh Stone, King's Rock, Sweet Apple, ...) — recognized
//     so their counts never pollute candy/energy, surfaced for confirmation
//   UI text (POWER UP, EVOLVE, WEIGHT, ...) — recognized as "this is Pokémon
//     GO" markers but never yields a value

import { RAID_BOSSES } from "@/data";
import { pokemonSearchName, speciesKey } from "@/lib/pokemonSearch";
import { formatNumber } from "@/lib/format";
import { ocrImage, releasePreprocessed, scheduleOcrCleanup, type OcrWord } from "@/lib/ocrEngine";

export type Word = OcrWord;

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** One energy with the species from ITS OWN label (a single page can list two
 *  species, e.g. Ralts shows Gallade + Gardevoir energy) or the species the
 *  label implies (Volt Fusion -> Kyurem, Crowned Shield -> Zamazenta). */
export interface EnergyHit {
  value: number;
  /** Normalized species from/implied-by this energy's label, else null. */
  species: string | null;
  /** Energy family — drives chip theming (mega/primal vs fusion/crowned). */
  kind?: "mega" | "primal" | "fusion" | "crowned";
  /** Mega form letter (X / Y) when the energy label carries one, else null. */
  form?: "x" | "y" | null;
  /** Display qualifier for non-mega energies: volt/blaze/solar/lunar/sword/shield/primal. */
  flavor?: string | null;
}

/** An evolution item read off the screen (shown for confirmation, never applied). */
export interface ItemHit {
  name: string;
  value: number;
}

export interface ScanResult {
  /** Roster species key when a candy/energy label matches a raid target, else null. */
  species: string | null;
  /** The species read from the labels (even if not a raid target) — for warnings. */
  detectedName: string | null;
  candy?: number;
  xlCandy?: number;
  stardust?: number;
  /** Energies (mega/primal/fusion/crowned), top-to-bottom, tagged with species. */
  megaEnergies: EnergyHit[];
  /** Evolution items with counts (King's Rock 70, Sinnoh Stone 45, ...). */
  items: ItemHit[];
  /** True when the image showed Pokémon GO UI (labels/markers), even if no values read. */
  looksLikePogo: boolean;
  /** File timestamp — used to pick the most-recent screenshot per species. */
  capturedAt: number;
  readAnything: boolean;
  /** Raw OCR text (for diagnostics when a read fails). */
  rawText?: string;
}

// ---------------------------------------------------------------------------
// Tokens & small helpers
// ---------------------------------------------------------------------------

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const alphaTokens = (text: string) => text.toLowerCase().match(/[a-z]+/g) ?? [];
const normSpecies = (s: string | null) => {
  const n = (s ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return n || null;
};

export function numVal(text: string): number | null {
  // Accept a number that is EITHER plain digits or properly thousands-grouped.
  // OCR reads commas as periods, so both group separators count ("1.142" is
  // 1,142 — but "2.07" is a weight, not a malformed group, and is rejected).
  // Trailing junk (" XL", a count's "›" arrow) is tolerated; LEADING LETTERS are
  // not — a resource icon fused into the digits ("81" -> "S1") must read as
  // nothing rather than as a confident wrong value.
  const m = text.replace(/\s/g, "").match(/^[^A-Za-z0-9]*(\d{1,3}(?:[.,]\d{3})+|\d+)\D*$/);
  if (!m) return null;
  const n = parseInt(m[1].replace(/[.,]/g, ""), 10);
  // No upper cap — Stardust can reach the billions, and OCR may add digits.
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

/** Lenient single-token match: exact, or one edit away for 4+ letter keywords
 *  (OCR garbles the stylized PoGo font — "CANDV", "ENERAY", "STARDUS7"). */
const like = (tok: string, target: string) =>
  tok === target || (target.length >= 4 && Math.abs(tok.length - target.length) <= 1 && editDistance(tok, target) <= 1);

const isCandyTok = (t: string) => t.includes("cand") || like(t, "candy");
const isEnergyTok = (t: string) => t.includes("ener") || like(t, "energy");
const isStardustTok = (t: string) => t.includes("stardus") || like(t, "stardust");
// Full "XL"/"XI" token only — a lone "x" (the Mewtwo X form letter) is NOT XL.
const isXlTok = (t: string) => t === "xl" || t === "xi";

// ---------------------------------------------------------------------------
// Label classification (the PoGo resource grammar)
// ---------------------------------------------------------------------------

export type LabelClass =
  | { type: "stardust" }
  | { type: "candy"; xl: boolean; species: string | null }
  | {
      type: "energy";
      energyKind: "mega" | "primal" | "fusion" | "crowned";
      species: string | null;
      form: "x" | "y" | null;
      flavor: string | null;
    }
  | { type: "item"; name: string }
  | { type: "marker" }
  | null;

/** Fusion/crowned flavors and the species each implies (the label itself names
 *  no Pokémon: "VOLT FUSION ENERGY" belongs to Kyurem). */
const ENERGY_FLAVORS: Record<string, string> = {
  volt: "kyurem",
  blaze: "kyurem",
  solar: "necrozma",
  lunar: "necrozma",
  sword: "zacian",
  shield: "zamazenta",
};

/** Known evolution items (normalized, no spaces) -> display name. */
const KNOWN_ITEMS: Record<string, string> = {
  kingsrock: "King's Rock",
  metalcoat: "Metal Coat",
  dragonscale: "Dragon Scale",
  sunstone: "Sun Stone",
  upgrade: "Upgrade",
  sinnohstone: "Sinnoh Stone",
  unovastone: "Unova Stone",
  sweetapple: "Sweet Apple",
  tartapple: "Tart Apple",
  syrupyapple: "Syrupy Apple",
  zygardecell: "Zygarde Cell",
  gimmighoulcoin: "Gimmighoul Coin",
};

/** Item word endings — future-proof catch-all for new evolution materials. */
const ITEM_SUFFIXES = ["stone", "apple", "cell", "coin", "coat", "scale", "rock", "wreath"];

/** Pokémon GO UI words: prove the screenshot is PoGo but never carry a value. */
const UI_MARKERS = new Set([
  "power",
  "evolve",
  "purify",
  "weight",
  "height",
  "hp",
  "cp",
  "gyms",
  "raids",
  "trainer",
  "battles",
  "max",
  "moves",
  "level",
  "change",
  "form",
  "mega",
  "primal",
  "reversion",
]);

/** UI words (and their OCR near-misses) never belong in a species name —
 *  "GROUDON PRIMAL ENERGY" must not pick up a fused "TRAINER BATTLES". */
const isNoiseTok = (t: string) => {
  if (UI_MARKERS.has(t)) return true;
  for (const m of UI_MARKERS) if (m.length >= 4 && like(t, m)) return true;
  return false;
};

const speciesOf = (toks: string[]) =>
  toks.filter((t) => t.length >= 2 && !isNoiseTok(t) && !isStardustTok(t)).join(" ") || null;

function lastIndex(toks: string[], pred: (t: string) => boolean): number {
  for (let i = toks.length - 1; i >= 0; i--) if (pred(toks[i])) return i;
  return -1;
}

/**
 * Classify one label block's tokens against the resource grammar. The grammar
 * is positional: the candy/energy keyword TERMINATES a real label (only an
 * XL or a wrapped X/Y form letter may trail it), so running text that merely
 * contains the word — the Mega-Evolve blurb's "...bonus Candy and boosted
 * CP" — can never classify as a resource and steal a value.
 */
export function classifyLabel(toks: string[]): LabelClass {
  if (toks.length === 0) return null;

  // STARDUST is a one-word label (one stray OCR token tolerated).
  if (toks.length <= 2 && toks.some(isStardustTok)) return { type: "stardust" };

  const candyIdx = lastIndex(toks, isCandyTok);
  if (candyIdx >= 0 && toks.slice(candyIdx + 1).every((t) => isXlTok(t) || t === "x" || t === "y")) {
    const xl = toks.slice(candyIdx + 1).some(isXlTok);
    return { type: "candy", xl, species: speciesOf(toks.slice(0, candyIdx)) };
  }

  const energyIdx = lastIndex(toks, isEnergyTok);
  if (energyIdx >= 0 && toks.slice(energyIdx + 1).every((t) => t === "x" || t === "y")) {
    const after = toks.slice(energyIdx + 1);
    let form: "x" | "y" | null = after.length ? (after[after.length - 1] as "x" | "y") : null;
    let energyKind: "mega" | "primal" | "fusion" | "crowned" = "mega";
    let flavor: string | null = null;
    let implied: string | null = null;
    const rest: string[] = [];
    for (const t of toks.slice(0, energyIdx)) {
      if (isEnergyTok(t) || like(t, "mega")) continue;
      if (like(t, "primal")) {
        energyKind = "primal";
        flavor = "primal";
        continue;
      }
      if (like(t, "fusion")) {
        energyKind = "fusion";
        continue;
      }
      if (like(t, "crowned")) {
        energyKind = "crowned";
        continue;
      }
      const fl = Object.keys(ENERGY_FLAVORS).find((k) => like(t, k));
      if (fl) {
        flavor = fl;
        implied = ENERGY_FLAVORS[fl];
        continue;
      }
      rest.push(t);
    }
    while (!form && rest.length && (rest[rest.length - 1] === "x" || rest[rest.length - 1] === "y")) {
      form = rest.pop() as "x" | "y";
    }
    const species = implied ?? speciesOf(rest);
    return { type: "energy", energyKind, species, form, flavor };
  }

  // Items: known table (fuzzy, OCR-tolerant) or a short phrase ending in an
  // item-ish word ("... STONE", "... APPLE").
  const joined = toks.join("");
  if (joined.length >= 4) {
    for (const [key, name] of Object.entries(KNOWN_ITEMS)) {
      if (editDistance(joined, key) / Math.max(joined.length, key.length) <= 0.25) {
        return { type: "item", name };
      }
    }
  }
  if (toks.length <= 3 && ITEM_SUFFIXES.some((s) => like(toks[toks.length - 1], s))) {
    return { type: "item", name: toks.map(cap).join(" ") };
  }

  if (toks.some((t) => UI_MARKERS.has(t))) return { type: "marker" };

  return null;
}

// ---------------------------------------------------------------------------
// Geometry: words -> label lines -> label blocks, then value pairing
// ---------------------------------------------------------------------------

interface Line {
  words: Word[];
  x0: number;
  x1: number;
  cy: number;
  h: number;
}

interface Block {
  lines: Line[];
  tokens: string[];
  x0: number;
  x1: number;
  /** Vertical center of the FIRST line — the value sits directly above it. */
  topCy: number;
  h: number;
}

interface NumTok {
  value: number;
  x: number;
  y: number;
  /** A lone "O" word read as zero — only claimed when no real digit competes. */
  soft?: boolean;
}

const wcx = (w: Word) => (w.x0 + w.x1) / 2;
const wcy = (w: Word) => (w.y0 + w.y1) / 2;
const wh = (w: Word) => w.y1 - w.y0 || 16;

/** Group label words into visual lines, splitting a row at column-sized gaps so
 *  adjacent grid cells ("APPLIN CANDY" | "APPLIN CANDY") never fuse. */
function buildLines(words: Word[]): Line[] {
  const labelWords = words.filter((w) => numVal(w.text) === null && /[a-z]/i.test(w.text));
  const sorted = [...labelWords].sort((a, b) => wcy(a) - wcy(b) || wcx(a) - wcx(b));
  const rows: Word[][] = [];
  for (const w of sorted) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(wcy(w) - wcy(row[0])) <= Math.max(wh(w), wh(row[0])) * 0.6) row.push(w);
    else rows.push([w]);
  }
  const lines: Line[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x0 - b.x0);
    let seg: Word[] = [];
    for (const w of row) {
      const prev = seg[seg.length - 1];
      if (prev && w.x0 - prev.x1 > Math.max(wh(w), wh(prev)) * 1.8) {
        lines.push(toLine(seg));
        seg = [];
      }
      seg.push(w);
    }
    if (seg.length) lines.push(toLine(seg));
  }
  return lines.sort((a, b) => a.cy - b.cy || a.x0 - b.x0);
}

function toLine(words: Word[]): Line {
  return {
    words,
    x0: Math.min(...words.map((w) => w.x0)),
    x1: Math.max(...words.map((w) => w.x1)),
    cy: words.reduce((s, w) => s + wcy(w), 0) / words.length,
    h: Math.max(...words.map(wh)),
  };
}

/** A wrapped-label continuation line: the XL of "APPLIN CANDY / XL" or the
 *  form letter of "MEWTWO MEGA ENERGY / X". */
const isContinuation = (toks: string[]) =>
  toks.length > 0 && toks.every((t) => isXlTok(t) || t === "x" || t === "y");

/** Merge vertically-adjacent, horizontally-overlapping lines into label blocks
 *  — this is what reassembles wrapped labels ("GARDEVOIR MEGA / ENERGY",
 *  "CROWNED SHIELD / ENERGY", "APPLIN CANDY / XL", "MEWTWO MEGA ENERGY / X").
 *  Two guards keep blocks from over-growing:
 *   - once a block already reads as a complete label, only XL/X/Y continuation
 *     lines may join (so "GROUDON PRIMAL / ENERGY" can't also swallow the
 *     "TRAINER BATTLES" tab text beneath it);
 *   - 1–2 letter scraps (resource icons misread as a letter) can neither start
 *     a block nor host a label, so a stray glyph on the value row can't become
 *     the anchor that real labels then merge into. */
export function buildBlocks(words: Word[]): Block[] {
  const blocks: Block[] = [];
  for (const line of buildLines(words)) {
    const lineToks = line.words.flatMap((w) => alphaTokens(w.text));
    const host = blocks.find((b) => {
      const last = b.lines[b.lines.length - 1];
      const dy = line.cy - last.cy;
      if (dy <= 0 || dy > Math.max(last.h, line.h) * 2.1) return false;
      const pad = Math.max(last.h, line.h);
      if (line.x0 > b.x1 + pad || line.x1 < b.x0 - pad) return false;
      // Only label-looking blocks accept more lines; complete labels accept
      // only wrapped XL / form-letter continuations.
      if (!b.tokens.some((t) => t.length >= 4)) return false;
      const cls = classifyLabel(b.tokens);
      if (cls && cls.type !== "marker" && !isContinuation(lineToks)) return false;
      return true;
    });
    if (host) {
      host.lines.push(line);
      host.x0 = Math.min(host.x0, line.x0);
      host.x1 = Math.max(host.x1, line.x1);
      host.tokens.push(...lineToks);
    } else if (lineToks.join("").length > 2) {
      blocks.push({
        lines: [line],
        tokens: lineToks,
        x0: line.x0,
        x1: line.x1,
        topCy: line.cy,
        h: line.h,
      });
    }
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Parsed screen (geometry-free intermediate shared with the text fallback)
// ---------------------------------------------------------------------------

export interface ParsedResource {
  kind: "stardust" | "candy" | "xlCandy" | "energy" | "item";
  energyKind?: "mega" | "primal" | "fusion" | "crowned";
  species: string | null;
  form?: "x" | "y" | null;
  flavor?: string | null;
  itemName?: string;
  /** Undefined when the label was visible but its number wasn't (cropped). */
  value?: number;
  /** Reading order (for X-then-Y energy ordering). */
  order: number;
}

export interface ParsedScreen {
  resources: ParsedResource[];
  /** Count of recognized PoGo UI markers (POWER UP, WEIGHT, HP, ...). */
  markers: number;
}

function toResource(c: Exclude<LabelClass, null | { type: "marker" }>, order: number): ParsedResource {
  switch (c.type) {
    case "stardust":
      return { kind: "stardust", species: null, order };
    case "candy":
      return { kind: c.xl ? "xlCandy" : "candy", species: c.species, order };
    case "energy":
      return { kind: "energy", energyKind: c.energyKind, species: c.species, form: c.form, flavor: c.flavor, order };
    case "item":
      return { kind: "item", itemName: c.name, species: null, order };
  }
}

/** Position-aware parse: classify every label block, then each resource block
 *  claims the nearest number directly above it (greedy, one number per block). */
export function parseScreen(words: Word[]): ParsedScreen {
  const blocks = buildBlocks(words);
  const numbers: NumTok[] = [];
  for (const w of words) {
    const v = numVal(w.text);
    if (v !== null) numbers.push({ value: v, x: wcx(w), y: wcy(w) });
    // The PoGo zero often reads as a letter O. Track it as a *soft* zero that
    // only a label with no real digit candidate will claim.
    else if (w.text.trim().toUpperCase() === "O") numbers.push({ value: 0, x: wcx(w), y: wcy(w), soft: true });
  }

  let markers = 0;
  const classified: { block: Block; cls: Exclude<LabelClass, null | { type: "marker" }> }[] = [];
  for (const block of blocks) {
    const cls = classifyLabel(block.tokens);
    if (!cls) continue;
    if (cls.type === "marker") markers++;
    else classified.push({ block, cls });
  }

  // Greedy nearest-above pairing: the value sits ~1.5–2.5 line-heights above
  // its label's first line, horizontally within the label's span. Soft zeros
  // (letter-O reads) carry a rank penalty so any real digit wins first.
  const candidates: { ci: number; ni: number; rank: number }[] = [];
  classified.forEach(({ block }, ci) => {
    numbers.forEach((n, ni) => {
      const dy = block.topCy - n.y;
      if (dy <= 0 || dy > block.h * 3.4) return;
      const pad = block.h * 1.6;
      if (n.x < block.x0 - pad || n.x > block.x1 + pad) return;
      candidates.push({ ci, ni, rank: dy + (n.soft ? block.h * 4 : 0) });
    });
  });
  candidates.sort((a, b) => a.rank - b.rank);
  const valueOf = new Map<number, number>();
  const takenNum = new Set<number>();
  for (const { ci, ni } of candidates) {
    if (valueOf.has(ci) || takenNum.has(ni)) continue;
    valueOf.set(ci, numbers[ni].value);
    takenNum.add(ni);
  }

  const ordered = classified
    .map(({ block, cls }, ci) => ({ block, cls, value: valueOf.get(ci) }))
    .sort((a, b) => a.block.topCy - b.block.topCy || a.block.x0 - b.block.x0);
  return {
    resources: ordered.map(({ cls, value }, i) => ({ ...toResource(cls, i), value })),
    markers,
  };
}

/**
 * Text-only fallback (no word boxes): same grammar, line by line. Values
 * precede labels in reading order; wrapped fragments ("X", "XL", "ENERGY Y",
 * a lone species line before "MEGA ENERGY") are stitched onto their label.
 */
export function parseScreenText(text: string): ParsedScreen {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const resources: ParsedResource[] = [];
  let markers = 0;
  let pending: number | null = null;
  let prevPlain: string[] | null = null; // unclassified line — maybe a wrapped species prefix

  for (const line of lines) {
    const n = numVal(line);
    const toks = alphaTokens(line);
    const last = resources[resources.length - 1];

    if (!toks.length) {
      if (n !== null) pending = n;
      continue;
    }
    // A lone "O" line is the PoGo zero misread as a letter.
    if (line.trim().toUpperCase() === "O" && pending === null) {
      pending = 0;
      continue;
    }
    // Wrapped continuations attach to the previous resource.
    if (toks.length === 1 && (toks[0] === "x" || toks[0] === "y") && last?.kind === "energy" && !last.form) {
      last.form = toks[0] as "x" | "y";
      continue;
    }
    if (toks.length === 1 && isXlTok(toks[0]) && last?.kind === "candy") {
      last.kind = "xlCandy";
      continue;
    }

    let cls = classifyLabel(toks);
    // "CHARIZARD MEGA" / "ENERGY X": the species line above didn't classify —
    // retry with it prepended.
    if (cls && cls.type === "energy" && !cls.species && prevPlain) {
      const merged = classifyLabel([...prevPlain, ...toks]);
      if (merged && merged.type === "energy") cls = merged;
    }

    if (!cls) {
      if (n !== null) {
        pending = n;
        prevPlain = null;
      } else {
        prevPlain = toks;
      }
      continue;
    }
    if (cls.type === "marker") {
      markers++;
      // A wrapped species line can read as a marker ("CHARIZARD MEGA") — keep
      // it as a candidate prefix for an energy label on the next line.
      prevPlain = toks;
      continue;
    }
    prevPlain = null;
    const value = n ?? pending ?? undefined;
    pending = null;
    resources.push({ ...toResource(cls, resources.length), value });
  }
  return { resources, markers };
}

// ---------------------------------------------------------------------------
// Species resolution (vocabulary-validated against the raid roster)
// ---------------------------------------------------------------------------

export interface SpeciesVocab {
  key: string;
  name: string;
}

function candidateTokens(text: string): string[] {
  const words = text.toUpperCase().match(/[A-Z]{3,}/g) ?? [];
  const toks = new Set<string>(words);
  for (let i = 0; i < words.length - 1; i++) toks.add(words[i] + words[i + 1]); // "TAPU"+"KOKO"
  return [...toks];
}

/** The roster's species vocabulary (one per species group, uppercased). */
const ROSTER_VOCAB: SpeciesVocab[] = (() => {
  const seen = new Set<string>();
  const list: SpeciesVocab[] = [];
  for (const b of RAID_BOSSES) {
    const key = speciesKey(b.name);
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ key, name: pokemonSearchName(b.name).toUpperCase().replace(/[^A-Z]/g, "") });
  }
  return list;
})();

/** Nearest roster species to any token in `text`, within an edit-distance ratio. */
export function fuzzyMatchSpecies(text: string, vocab: SpeciesVocab[]): string | null {
  const toks = candidateTokens(text);
  let best: { key: string; score: number } | null = null;
  for (const sp of vocab) {
    if (sp.name.length < 3) continue;
    for (const tok of toks) {
      const score = editDistance(tok, sp.name) / Math.max(tok.length, sp.name.length);
      if (score <= 0.34 && (!best || score < best.score)) best = { key: sp.key, score };
    }
  }
  return best?.key ?? null;
}

/**
 * Resolve the species from the candy/energy LABELS only (never arbitrary text,
 * which used to match e.g. "Max Spirit" -> Mesprit). Energy labels (the evolved
 * form, e.g. GARDEVOIR — or the implied fusion species) win over candy labels
 * (the base form, e.g. RALTS). Returns the matched roster key (raid target)
 * and the read name (for the "not a raid target" warning).
 */
export function chooseSpecies(
  energySpecies: string[],
  candySpecies: string[],
  vocab: SpeciesVocab[],
): { key: string | null; name: string | null } {
  const candidates = [...energySpecies, ...candySpecies]
    .map((s) => s.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  let key: string | null = null;
  for (const c of candidates) {
    const m = fuzzyMatchSpecies(c, vocab);
    if (m) {
      key = m;
      break;
    }
  }
  // The displayed name (for the not-available warning) is the last meaningful
  // word of the first candidate — the species/form trails any stray prefix.
  const words = (candidates[0] ?? "").split(" ").filter(Boolean);
  return { key, name: words.length ? words[words.length - 1] : null };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/** Build the final ScanResult from a parsed screen (boxes or text path). */
export function assembleScan(parsed: ParsedScreen, capturedAt: number, rawText = ""): ScanResult {
  const res = parsed.resources;
  const valued = res.filter((r) => r.value !== undefined);
  const candy = valued.find((r) => r.kind === "candy")?.value;
  // Every Pokémon has an XL pool, but a page can simply not show the cell (Mew,
  // low-level accounts). Candy read + no XL cell anywhere => the XL count is 0.
  const xlRead = valued.find((r) => r.kind === "xlCandy")?.value;
  const xlCandy = xlRead ?? (candy !== undefined && !res.some((r) => r.kind === "xlCandy") ? 0 : undefined);
  const stardust = valued.find((r) => r.kind === "stardust")?.value;
  const megaEnergies: EnergyHit[] = valued
    .filter((r) => r.kind === "energy")
    .map((r) => {
      const hit: EnergyHit = { value: r.value!, species: normSpecies(r.species) };
      if (r.energyKind) hit.kind = r.energyKind;
      if (r.form) hit.form = r.form;
      if (r.flavor) hit.flavor = r.flavor;
      return hit;
    });
  const items: ItemHit[] = valued
    .filter((r) => r.kind === "item")
    .map((r) => ({ name: r.itemName ?? "Item", value: r.value! }));

  // Species comes from ALL candy/energy labels, valued or not — a crop can show
  // a label whose number is cut off and we still want to preselect the Pokémon.
  const energySpecies = res.filter((r) => r.kind === "energy" && r.species).map((r) => r.species!);
  const candySpecies = res
    .filter((r) => (r.kind === "candy" || r.kind === "xlCandy") && r.species)
    .map((r) => r.species!);
  const resolved = chooseSpecies(energySpecies, candySpecies, ROSTER_VOCAB);

  return {
    species: resolved.key,
    detectedName: normSpecies(resolved.name),
    candy,
    xlCandy,
    stardust,
    megaEnergies,
    items,
    looksLikePogo: res.length > 0 || parsed.markers >= 2,
    capturedAt,
    readAnything: candy !== undefined || xlCandy !== undefined || megaEnergies.length > 0,
    // Keep the full text (capped generously) so a failed scan can be copied
    // verbatim into a unit test; the UI truncates it for display.
    rawText: rawText.replace(/\s+/g, " ").trim().slice(0, 4000),
  };
}

/** Scan from word boxes, falling back to raw-text parsing when boxes read nothing. */
export function scanFromWords(words: Word[], text: string, capturedAt: number): ScanResult {
  const byBoxes = words.length ? assembleScan(parseScreen(words), capturedAt, text) : null;
  if (byBoxes?.readAnything) return byBoxes;
  const byText = assembleScan(parseScreenText(text), capturedAt, text);
  if (byText.readAnything || !byBoxes) return byText;
  return byBoxes.looksLikePogo || !byText.looksLikePogo ? byBoxes : byText;
}

/**
 * Merge two parsed passes of the SAME screen (sparse-text PSM 11 + auto PSM 3).
 * Each mode misses different things — sparse skips tiny wrapped "XL" lines,
 * auto drops isolated numbers — so the union, keyed by what each label IS,
 * recovers cells either pass lost. The primary pass wins value conflicts.
 */
export function mergeParsed(primary: ParsedScreen, secondary: ParsedScreen): ParsedScreen {
  const keyOf = (r: ParsedResource) =>
    [r.kind, r.energyKind ?? "", r.species ?? "", r.form ?? "", r.flavor ?? "", r.itemName ?? ""].join("|");
  const resources = primary.resources.map((r) => ({ ...r }));
  const byKey = new Map<string, ParsedResource>();
  for (const r of resources) if (!byKey.has(keyOf(r))) byKey.set(keyOf(r), r);
  for (const r of secondary.resources) {
    const hit = byKey.get(keyOf(r));
    if (!hit) {
      const added = { ...r, order: resources.length };
      resources.push(added);
      byKey.set(keyOf(added), added);
    } else if (hit.value === undefined && r.value !== undefined) {
      hit.value = r.value;
    }
  }
  return { resources, markers: Math.max(primary.markers, secondary.markers) };
}

/** Parse one OCR page: word boxes when present, raw text otherwise. */
export function parsePage(page: { words: Word[]; text: string }): ParsedScreen {
  return page.words.length ? parseScreen(page.words) : parseScreenText(page.text);
}

// ---------------------------------------------------------------------------
// Display + boss association helpers
// ---------------------------------------------------------------------------

/** Human chip for an energy hit: "Charizard X En 209" / "Kyurem Volt En 1,420" /
 *  "Groudon Primal En 485" / "Energy 6,212" when the species didn't read. */
export function energyChip(e: EnergyHit): string {
  const v = formatNumber(e.value);
  const qual = e.form ? ` ${e.form.toUpperCase()}` : e.flavor ? ` ${cap(e.flavor)}` : "";
  if (!e.species) return `Energy${qual} ${v}`;
  return `${cap(e.species)}${qual} En ${v}`;
}

/**
 * Assign one energy value per energy-boss. A single boss takes the energy whose
 * label species matches it (so Gardevoir takes the Gardevoir energy, not
 * Gallade's); X/Y groups (same species, two bosses) map by the form letter,
 * else top-to-bottom order.
 */
export function energyForBosses(energies: EnergyHit[], bosses: { name: string }[]): number[] {
  if (bosses.length === 1) {
    const key = speciesKey(bosses[0].name);
    let bestIdx = -1;
    let best = Infinity;
    energies.forEach((e, i) => {
      if (!e.species) return;
      const score = editDistance(e.species, key) / Math.max(e.species.length, key.length, 1);
      if (score < best) {
        best = score;
        bestIdx = i;
      }
    });
    const idx = best <= 0.34 ? bestIdx : -1;
    const val = idx >= 0 ? energies[idx].value : energies[0]?.value;
    return val !== undefined ? [val] : [];
  }
  // X/Y (same species, multiple bosses): match by the form letter in the boss
  // name ("Mega Mewtwo X" ↔ energy tagged form "x") when the labels carried one,
  // else fall back to top-to-bottom reading order.
  const bossForm = (name: string): "x" | "y" | null => {
    const m = name.trim().toLowerCase().match(/\b([xy])$/);
    return (m?.[1] as "x" | "y") ?? null;
  };
  return bosses
    .map((b, i) => {
      const bf = bossForm(b.name);
      const byForm = bf ? energies.find((e) => e.form === bf) : undefined;
      return (byForm ?? energies[i])?.value;
    })
    .filter((v): v is number => v !== undefined);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export async function scanScreenshot(file: File): Promise<ScanResult> {
  const capturedAt = file.lastModified || Date.now();
  try {
    // Two passes over the same preprocessed image (the canvas is cached):
    // sparse-text finds scattered stat cells, auto-layout finds the tiny
    // wrapped fragments sparse mode skips. Merge recovers both.
    const sparse = await ocrImage(file, { psm: "11" });
    let parsed = parsePage(sparse);
    try {
      const auto = await ocrImage(file, { psm: "3" });
      parsed = mergeParsed(parsed, parsePage(auto));
    } catch {
      /* the sparse pass alone is still useful */
    }
    let result = assembleScan(parsed, capturedAt, sparse.text);
    // Dark / low-contrast screenshots can be crushed by the levels curve — if
    // the processed image read nothing, retry once on the raw file (Tesseract's
    // own binarization) before giving up.
    if (!result.readAnything && sparse.preprocessed) {
      try {
        const raw = await ocrImage(file, { raw: true, psm: "11" });
        const retry = scanFromWords(raw.words, raw.text, capturedAt);
        if (retry.readAnything || (retry.looksLikePogo && !result.looksLikePogo)) result = retry;
      } catch {
        /* keep the first result */
      }
    }
    return result;
  } finally {
    // Free this screenshot's preprocessing canvas right away — batches on iOS
    // Safari otherwise accumulate enough canvas memory to get the tab killed.
    releasePreprocessed(file);
    scheduleOcrCleanup();
  }
}
