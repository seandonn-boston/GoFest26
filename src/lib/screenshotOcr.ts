// Client-side OCR for Pokémon GO detail screenshots. Tesseract.js is loaded
// from a CDN at runtime (the build env can't install npm packages, and this
// keeps OCR entirely in the user's browser — no upload, no backend).
//
// Identification is by the on-screen LABELS ("MEWTWO CANDY", "DRAGONITE MEGA
// ENERGY", "GROUDON PRIMAL ENERGY"), never the sprite or nickname — labels
// survive shinies, poses and nicknames. Numbers (0–999,999) can sit anywhere,
// so every value is taken from the number directly above its label.

import { RAID_BOSSES } from "@/data";
import { pokemonSearchName, speciesKey } from "@/lib/pokemonSearch";
import { formatNumber } from "@/lib/format";

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
interface TWord {
  text: string;
  bbox?: Box;
}
interface TData {
  text: string;
  words?: TWord[];
  blocks?: { paragraphs?: { lines?: { words?: TWord[] }[] }[] }[];
}
interface TWorker {
  setParameters: (p: Record<string, string>) => Promise<unknown>;
  recognize: (image: unknown) => Promise<{ data: TData }>;
  terminate?: () => Promise<unknown>;
}
interface TesseractGlobal {
  recognize: (image: unknown, lang?: string, options?: unknown) => Promise<{ data: TData }>;
  createWorker?: (lang?: string, oem?: number, options?: unknown) => Promise<TWorker>;
}

declare global {
  interface Window {
    Tesseract?: TesseractGlobal;
  }
}

const CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@4.1.4/dist/tesseract.min.js";
let loader: Promise<TesseractGlobal> | null = null;
let workerP: Promise<TWorker | null> | null = null;

export function loadTesseract(): Promise<TesseractGlobal> {
  if (typeof window === "undefined") return Promise.reject(new Error("OCR needs a browser"));
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = CDN;
    s.async = true;
    s.onload = () =>
      window.Tesseract ? resolve(window.Tesseract) : reject(new Error("OCR engine failed to load"));
    s.onerror = () =>
      reject(
        new Error(
          typeof navigator !== "undefined" && navigator.onLine === false
            ? "You're offline — the OCR engine couldn't be downloaded. Reconnect and try again."
            : "Couldn't load the OCR engine (a network or firewall issue blocked the download).",
        ),
      );
    document.head.appendChild(s);
  });
  return loader;
}

/**
 * A reused worker set to "sparse text" page segmentation (PSM 11) — it finds
 * text anywhere in the image (good for scattered stat labels/numbers) and always
 * returns word boxes. Falls back to the simple recognize() if unavailable.
 */
async function getWorker(): Promise<TWorker | null> {
  const T = await loadTesseract();
  if (!T.createWorker) return null;
  if (!workerP) {
    workerP = (async () => {
      try {
        const w = await T.createWorker!("eng");
        await w.setParameters({
          tessedit_pageseg_mode: "11", // sparse text — find scattered stat labels/numbers
          // Disable the dictionary/language model so it doesn't "spellcheck"
          // Pokémon names (non-words) into real words.
          load_system_dawg: "0",
          load_freq_dawg: "0",
          // Only the chars we care about: uppercase labels + digits.
          tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,. ",
        });
        return w;
      } catch {
        return null;
      }
    })();
  }
  return workerP;
}

// Tesseract holds a worker (~10MB) alive; terminate it after a quiet spell so a
// one-off scan doesn't pin memory for the whole session. The next scan lazily
// recreates it.
let workerIdleTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleWorkerCleanup() {
  if (typeof window === "undefined") return;
  if (workerIdleTimer) clearTimeout(workerIdleTimer);
  workerIdleTimer = setTimeout(() => {
    const pending = workerP;
    workerP = null;
    workerIdleTimer = null;
    pending?.then((w) => w?.terminate?.()).catch(() => {});
  }, 60_000);
}

export interface StatEntry {
  kind: "candy" | "xlCandy" | "energy";
  species: string;
  /** Mega form letter (Mewtwo / Charizard X & Y) when the label carries one. */
  form?: "x" | "y" | null;
  value: number;
  /** Vertical position (for ordering Mewtwo's X-then-Y energies). */
  y: number;
}

/** One mega/primal energy with the species from ITS OWN label (a single page can
 *  list two species, e.g. Ralts shows Gallade + Gardevoir energy). */
export interface EnergyHit {
  value: number;
  /** Normalized species from this energy's label (null when read from the grid). */
  species: string | null;
  /** Mega form letter (X / Y) when the energy label carries one, else null. */
  form?: "x" | "y" | null;
}

/** Human chip for an energy hit: "Charizard X En 209" / "Gardevoir En 80" /
 *  "Energy 6,212" when the species didn't read. */
export function energyChip(e: EnergyHit): string {
  const v = formatNumber(e.value);
  if (!e.species) return `Energy ${v}`;
  const name = e.species.charAt(0).toUpperCase() + e.species.slice(1);
  const form = e.form ? ` ${e.form.toUpperCase()}` : "";
  return `${name}${form} En ${v}`;
}

export interface ScanResult {
  /** Roster species key when a candy/energy label matches a raid target, else null. */
  species: string | null;
  /** The species read from the label (even if not a raid target) — for warnings. */
  detectedName: string | null;
  candy?: number;
  xlCandy?: number;
  /** Mega/Primal energies, top-to-bottom, each tagged with its label species. */
  megaEnergies: EnergyHit[];
  /** File timestamp — used to pick the most-recent screenshot per species. */
  capturedAt: number;
  readAnything: boolean;
  /** Raw OCR text (for diagnostics when a read fails). */
  rawText?: string;
}

interface Word {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const cx = (w: Word) => (w.x0 + w.x1) / 2;
const cy = (w: Word) => (w.y0 + w.y1) / 2;
const alpha = (w: Word) => w.text.toLowerCase().replace(/[^a-z]/g, "");
// Lenient matchers — OCR mangles the stylized PoGo font (e.g. "candv", "eneray").
const isCandyW = (a: string) => a.includes("cand");
const isEnergyW = (a: string) => a.includes("ener");
const isXlW = (a: string) => a === "xl" || a === "xi";
const isStopW = (a: string) => isCandyW(a) || isEnergyW(a) || isXlW(a) || a === "mega" || a === "primal" || a.includes("stardus");

export function numVal(text: string): number | null {
  // Accept a (possibly label-padded) number that is EITHER plain digits or
  // properly thousands-grouped ("1,001,623") — but reject malformed grouping
  // like "1,2,3", which is OCR noise rather than a real value. Leading/trailing
  // non-digits ("CP ", " XL") are tolerated.
  const m = text.replace(/\s/g, "").match(/^\D*(\d{1,3}(?:,\d{3})+|\d+)\D*$/);
  if (!m) return null;
  const n = parseInt(m[1].replace(/,/g, ""), 10);
  // No upper cap — Stardust can reach the billions, and OCR may add digits.
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Word boxes from whichever shape Tesseract provides (NOT both — `data.words`
 *  and `data.blocks` hold the SAME words, so merging double-counts every value).
 *  Reading a single source keeps every distinct stat, even ones that legitimately
 *  share a number (e.g. Energy X 0 and Energy Y 0). */
function collectWords(data: TData): Word[] {
  let raw: TWord[] = [];
  if (data.words?.length) {
    raw = data.words;
  } else {
    for (const b of data.blocks ?? [])
      for (const p of b.paragraphs ?? [])
        for (const l of p.lines ?? []) for (const w of l.words ?? []) raw.push(w);
  }
  return raw.filter((w) => w.bbox && w.text.trim()).map((w) => ({ text: w.text.trim(), ...w.bbox! }));
}

function speciesLeftOf(words: Word[], anchor: Word): string {
  const rowH = anchor.y1 - anchor.y0 || 12;
  return words
    .filter((w) => Math.abs(cy(w) - cy(anchor)) < rowH * 0.8 && cx(w) < cx(anchor))
    .sort((a, b) => cx(a) - cx(b))
    .map(alpha)
    .filter((t) => t.length > 1 && !isStopW(t))
    .join(" ")
    .trim();
}

/**
 * Split a noisy energy/candy label phrase into a species and an optional mega
 * FORM letter. Per the PoGo label grammar the keyword is "energy": the species
 * always precedes it ("[Species] Mega Energy"), and the X/Y forms tack a lone
 * letter on ("Charizard X … Energy", "Mewtwo Mega Energy X"). We drop the label
 * noise words (mega/primal/energy/candy/xl/stardust + OCR variants), peel a
 * trailing x/y as the form, and keep the rest as the species.
 */
export function speciesAndForm(phrase: string): { species: string; form: "x" | "y" | null } {
  const toks = phrase
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !/ener|cand|stardus/.test(t) && t !== "mega" && t !== "primal" && t !== "xl" && t !== "xi");
  let form: "x" | "y" | null = null;
  while (toks.length && (toks[toks.length - 1] === "x" || toks[toks.length - 1] === "y")) {
    form = toks.pop() as "x" | "y";
  }
  const species = toks.filter((t) => t.length >= 2).join(" ");
  return { species, form };
}

/**
 * Reconstruct the full label phrase for an energy anchor, robust to the two ways
 * PoGo lays it out: species to the LEFT on the same line ("Gallade Mega Energy")
 * or WRAPPED with the species on the line above ("Charizard X" / "Mega Energy").
 * Walking left stops at a column gap so the neighbouring Candy column can't bleed
 * in (which used to fuse "ralts" + "gallade" → "raltsgallade").
 */
function energyLabelPhrase(words: Word[], anchor: Word): string {
  const h = anchor.y1 - anchor.y0 || 14;
  const ay = cy(anchor);
  // Same line, at or left of the anchor, contiguous (break at a column-width gap).
  const sameLine = words
    .filter((w) => Math.abs(cy(w) - ay) <= h * 0.7 && cx(w) <= cx(anchor) + 1)
    .sort((a, b) => b.x1 - a.x1);
  const kept: Word[] = [];
  let leftEdge = anchor.x1;
  for (const w of sameLine) {
    if (kept.length && leftEdge - w.x1 > h * 1.6) break; // crossed into another column
    kept.push(w);
    leftEdge = w.x0;
  }
  const minX = Math.min(...kept.map((w) => w.x0), anchor.x0);
  const maxX = Math.max(...kept.map((w) => w.x1), anchor.x1);
  // The wrapped species line directly above, horizontally overlapping the label.
  const above = words.filter((w) => {
    const dy = ay - cy(w);
    return dy > h * 0.7 && dy <= h * 2.1 && w.x1 >= minX - h && w.x0 <= maxX + h;
  });
  return [...above, ...kept]
    .sort((a, b) => cy(a) - cy(b) || cx(a) - cx(b))
    .map((w) => w.text)
    .join(" ");
}

/** Position-aware entry parse: each label takes the number directly above it. */
export function parseEntries(words: Word[]): StatEntry[] {
  if (words.length === 0) return [];
  const width = Math.max(...words.map((w) => w.x1), 1);
  const xTol = width * 0.33;
  const numbers = words
    .map((w) => ({ value: numVal(w.text), x: cx(w), y: cy(w) }))
    .filter((n): n is { value: number; x: number; y: number } => n.value !== null);

  const numberAbove = (lx: number, ly: number): number | undefined => {
    let best: number | undefined;
    let bestDy = Infinity;
    for (const n of numbers) {
      const dy = ly - n.y;
      if (dy <= 0 || Math.abs(n.x - lx) > xTol) continue;
      if (dy < bestDy) {
        bestDy = dy;
        best = n.value;
      }
    }
    return best;
  };

  const entries: StatEntry[] = [];

  for (const c of words.filter((w) => isCandyW(alpha(w)))) {
    const rowH = c.y1 - c.y0 || 12;
    const xlRight = words.some((w) => isXlW(alpha(w)) && Math.abs(cy(w) - cy(c)) < rowH && cx(w) > cx(c));
    const value = numberAbove(cx(c), cy(c));
    if (value === undefined) continue;
    entries.push({ kind: xlRight ? "xlCandy" : "candy", species: speciesLeftOf(words, c), value, y: cy(c) });
  }

  for (const e of words.filter((w) => isEnergyW(alpha(w)))) {
    const value = numberAbove(cx(e), cy(e));
    if (value === undefined) continue;
    const { species, form } = speciesAndForm(energyLabelPhrase(words, e));
    entries.push({ kind: "energy", species, form, value, y: cy(e) });
  }

  return entries;
}

export interface GridValues {
  candy?: number;
  xlCandy?: number;
  megaEnergies: number[];
}

interface NumTok {
  value: number;
  x: number;
  y: number;
  h: number;
}

/**
 * Layout-aware value extraction by the number grid (no labels needed — digits
 * OCR far better than the stylized font). Pokémon GO has three stat layouts:
 *   Stardust | Candy | XL            (non-mega: one row)
 *   Stardust | Candy / XL | Energy   (mega: 2×2)
 *   …with a third row for the second Energy (Mewtwo/Charizard X & Y)
 * Stardust is the largest number and anchors the grid; CP/HP/weight sit ABOVE it
 * so they're excluded by the "right-of / below Stardust" logic — which also makes
 * this work no matter how far the screenshot is scrolled.
 */
export function parseByGrid(words: Word[]): GridValues | null {
  if (words.length === 0) return null;
  const toks: NumTok[] = words
    .map((w) => {
      const v = numVal(w.text);
      return v === null ? null : { value: v, x: cx(w), y: cy(w), h: w.y1 - w.y0 || 18 };
    })
    .filter((t): t is NumTok => t !== null);
  if (toks.length < 2) return null;

  // Prefer the Stardust value anchored by its on-screen "STARDUST" label: the
  // number sits directly above the label. This fixes hoarders whose Candy
  // exceeds their Stardust (the old max-number heuristic picked Candy) and
  // low-Stardust players the heuristic would also misread. Fall back to the
  // largest number when the label didn't OCR.
  const sdWord = words.find((w) => /stardu/.test(alpha(w)));
  let stardust: NumTok;
  let labelAnchored = false;
  if (sdWord) {
    const wx = cx(sdWord);
    const wy = cy(sdWord);
    const xTol = (sdWord.x1 - sdWord.x0 || 60) * 1.5;
    const above = toks
      .filter((t) => t.y < wy && Math.abs(t.x - wx) <= xTol)
      .sort((a, b) => wy - a.y - (wy - b.y));
    if (above.length) {
      stardust = above[0];
      labelAnchored = true;
    } else {
      stardust = toks.reduce((a, b) => (b.value > a.value ? b : a));
    }
  } else {
    stardust = toks.reduce((a, b) => (b.value > a.value ? b : a));
  }
  // A labelled Stardust can be tiny (new/spent-out accounts); only require the
  // 1,000+ plausibility floor when we're guessing via the largest number.
  if (!labelAnchored && stardust.value < 1000) return null;
  const rowTol = stardust.h * 1.3;
  const others = toks.filter((t) => t !== stardust);
  const row0 = others
    .filter((t) => Math.abs(t.y - stardust.y) <= rowTol && t.x > stardust.x)
    .sort((a, b) => a.x - b.x);
  const below = others.filter((t) => t.y > stardust.y + rowTol).sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: NumTok[][] = [];
  for (const t of below) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(t.y - last[0].y) <= rowTol) last.push(t);
    else rows.push([t]);
  }
  rows.forEach((r) => r.sort((a, b) => a.x - b.x));

  const out: GridValues = { megaEnergies: [] };
  if (row0.length >= 2) {
    // Non-mega: Stardust | Candy | XL across one row.
    out.candy = row0[0].value;
    out.xlCandy = row0[1].value;
  } else if (row0.length === 1) {
    // Mega: Stardust | Candy on top; XL | Energy below (+ optional second energy
    // for Mewtwo/Charizard X & Y).
    out.candy = row0[0].value;
    const r1 = rows[0] ?? [];
    if (r1[0]) out.xlCandy = r1[0].value;
    if (r1[1]) out.megaEnergies.push(r1[1].value);
    // Only count a third row as the second energy if it's the same step below as
    // the grid rows — a far-below number is the "Mega Evolve" cost, not energy.
    const r2 = rows[1] ?? [];
    if (r1[0] && r2[0]) {
      const step = r1[0].y - stardust.y;
      const gap = r2[0].y - r1[0].y;
      if (step > 0 && gap <= step * 1.6) out.megaEnergies.push(r2[r2.length - 1].value);
    }
  } else {
    return null;
  }
  if (out.candy === undefined && out.xlCandy === undefined && out.megaEnergies.length === 0) return null;
  return out;
}

/**
 * Pure text-order fallback (no word boxes): all numbers in reading order, anchor
 * on the largest (Stardust), then Candy / XL / Energy follow it. Can't separate a
 * second energy from the Mega-Evolve cost, so it reads at most one energy — the
 * position grid handles X/Y.
 */
export function parseByTextOrder(text: string): GridValues | null {
  const nums = (text.match(/\d[\d,]*/g) ?? [])
    .map((s) => parseInt(s.replace(/,/g, ""), 10))
    .filter((n) => Number.isFinite(n) && n >= 0);
  if (nums.length < 3) return null;
  let maxIdx = 0;
  for (let i = 1; i < nums.length; i++) if (nums[i] > nums[maxIdx]) maxIdx = i;
  if (nums[maxIdx] < 1000) return null; // need a plausible Stardust anchor
  const after = nums.slice(maxIdx + 1);
  if (after.length < 2) return null;
  const out: GridValues = { candy: after[0], xlCandy: after[1], megaEnergies: [] };
  if (after[2] !== undefined) out.megaEnergies.push(after[2]);
  return out;
}

/** Text-line fallback (single column only; used when no word boxes exist). */
export function parseEntriesFromText(text: string): StatEntry[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const entries: StatEntry[] = [];
  let pending: number | null = null;
  let y = 0;
  for (const line of lines) {
    const lower = line.toLowerCase();
    const isLabel = /cand|ener/.test(lower);
    const n = numVal(line);
    if (!isLabel) {
      // A lone "X"/"Y" line right after an energy label is that energy's mega
      // form (the X/Y wraps onto its own line), e.g. "MEWTWO MEGA ENERGY" / "X".
      const letter = lower.replace(/[^a-z]/g, "");
      const last = entries[entries.length - 1];
      if ((letter === "x" || letter === "y") && last?.kind === "energy" && !last.form) {
        last.form = letter;
        continue;
      }
      if (n !== null) pending = n;
      continue;
    }
    const value = n ?? pending ?? undefined;
    pending = null;
    if (value === undefined) continue;
    const m = lower.replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
    // Require the full "XL"/"XI" token — a lone "x" (e.g. the Mewtwo X form
    // letter) must NOT promote a candy line to XL candy.
    if (/cand/.test(m) && /\b(?:xl|xi)\b/.test(m)) entries.push({ kind: "xlCandy", species: m.split(/\s+cand/)[0].trim(), value, y: y++ });
    else if (/ener/.test(m)) {
      // Keyword "energy": the species precedes it, a trailing x/y is the form.
      const { species, form } = speciesAndForm(m);
      entries.push({ kind: "energy", species, form, value, y: y++ });
    } else if (/cand/.test(m)) entries.push({ kind: "candy", species: m.split(/\s+cand/)[0].trim(), value, y: y++ });
  }
  return entries;
}

const normSpecies = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

// ---- Vocabulary-validated species matching ----
// We have a fixed roster, so a garbled OCR token can snap to the nearest real
// species (e.g. "MEWTW0" -> mewtwo). The roster name appears in the candy label
// (legendaries) or the energy label (megas — the candy there is the base form).
export interface SpeciesVocab {
  key: string;
  name: string;
}

function editDistance(a: string, b: string): number {
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
 * which used to match e.g. "Max Spirit" -> Mesprit). Energy labels (the form,
 * e.g. CHARIZARD) win over candy labels (the base form, e.g. CHARMANDER).
 * Returns the matched roster key (raid target) and the read name (for warnings).
 */
export function chooseSpecies(
  energySpecies: string[],
  candySpecies: string[],
  vocab: SpeciesVocab[],
): { key: string | null; name: string | null } {
  // Keep word boundaries (don't collapse to a single alpha run) so a stray prefix
  // — e.g. the Stardust label leaking in as "stardust giratina" — doesn't fuse
  // into one token the matcher can't recognize. candidateTokens splits on spaces
  // and still finds "GIRATINA".
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
  // The displayed name (for the not-available warning) is the last meaningful word
  // of the first candidate — the species/form trails any base-form or stray prefix
  // ("stardust giratina" -> "giratina", "ralts gallade" -> "gallade").
  const words = (candidates[0] ?? "").split(" ").filter(Boolean);
  return { key, name: words.length ? words[words.length - 1] : null };
}

export function aggregateEntries(entries: StatEntry[], capturedAt: number, rawText = ""): ScanResult {
  const candy = entries.find((e) => e.kind === "candy")?.value;
  const xlCandy = entries.find((e) => e.kind === "xlCandy")?.value;
  const energy = entries.filter((e) => e.kind === "energy").sort((a, b) => a.y - b.y);
  const speciesRaw = energy[0]?.species || entries.find((e) => e.kind === "candy" || e.kind === "xlCandy")?.species || "";
  return {
    species: normSpecies(speciesRaw) || null,
    detectedName: normSpecies(speciesRaw) || null,
    candy,
    xlCandy,
    megaEnergies: energy.map((e) => {
      const hit: EnergyHit = { value: e.value, species: normSpecies(e.species) || null };
      if (e.form) hit.form = e.form; // only X/Y energies carry a form
      return hit;
    }),
    capturedAt,
    readAnything: entries.length > 0,
    // Keep the full text (capped generously) so a failed scan can be copied
    // verbatim into a unit test; the UI truncates it for display.
    rawText: rawText.replace(/\s+/g, " ").trim().slice(0, 4000),
  };
}

/**
 * Assign one energy value per energy-boss. A single boss takes the energy whose
 * label species matches it (so Gardevoir takes the Gardevoir energy, not
 * Gallade's); X/Y groups (same species, two bosses) map by top-to-bottom order.
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

/**
 * Preprocess for OCR: grayscale + strong contrast (whitening the colorful photo
 * header, keeping the dark stat text crisp) so a *full* screenshot reads as well
 * as a tight crop — no fragile fixed cropping. Falls back to the raw file if the
 * canvas pipeline is unavailable.
 */
async function preprocess(file: File): Promise<HTMLCanvasElement | File> {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return file;
  try {
    // Respect EXIF orientation so a sideways camera photo is uprighted before
    // OCR (screenshots have no EXIF and are unaffected). Fall back if the
    // options bag isn't supported.
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      bitmap = await createImageBitmap(file);
    }
    const maxW = 1600;
    const scale = bitmap.width > maxW ? maxW / bitmap.width : 1;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    // Levels: map [150..225] -> [0..255] so the *gray* labels darken to readable
    // black (the old contrast curve bleached them toward white), while the white
    // card stays white. Dark numbers and the colorful header collapse cleanly.
    const Bp = 150;
    const Wp = 225;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      let g = ((lum - Bp) / (Wp - Bp)) * 255;
      d[i] = d[i + 1] = d[i + 2] = g < 0 ? 0 : g > 255 ? 255 : g;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  } catch {
    return file;
  }
}

/** Turn one OCR pass into a ScanResult (shared by the main + dark-retry passes). */
function assembleResult(data: TData, capturedAt: number): ScanResult {
  const words = collectWords(data);

  // Labels are best-effort (OCR garbles them) — used only for SPECIES.
  let labelEntries = parseEntries(words);
  if (!labelEntries.length) labelEntries = parseEntriesFromText(data.text);
  const fromLabels = aggregateEntries(labelEntries, capturedAt, data.text || "");

  // Species comes ONLY from the candy/energy labels (not arbitrary text), so
  // "Max Spirit" etc. can't masquerade as a species. Energy label (the form)
  // wins over candy label (the base form).
  const energySpecies = labelEntries.filter((e) => e.kind === "energy").map((e) => e.species);
  const candySpecies = labelEntries.filter((e) => e.kind === "candy" || e.kind === "xlCandy").map((e) => e.species);
  const resolved = chooseSpecies(energySpecies, candySpecies, ROSTER_VOCAB);

  // Labels anchor on their own row, so they read the correct value regardless of
  // scroll position and ignore stray numbers (e.g. Max-Move levels). Grid/text
  // order is the fallback when a label didn't read.
  const grid = parseByGrid(words) ?? parseByTextOrder(data.text || "");
  const candy = fromLabels.candy ?? grid?.candy;
  const xlCandy = fromLabels.xlCandy ?? grid?.xlCandy;
  const megaEnergies: EnergyHit[] = fromLabels.megaEnergies.length
    ? fromLabels.megaEnergies
    : (grid?.megaEnergies ?? []).map((value) => ({ value, species: null }));

  return {
    species: resolved.key,
    detectedName: resolved.name,
    candy,
    xlCandy,
    megaEnergies,
    capturedAt,
    readAnything: candy !== undefined || xlCandy !== undefined || megaEnergies.length > 0,
    rawText: fromLabels.rawText,
  };
}

export async function scanScreenshot(file: File): Promise<ScanResult> {
  const Tesseract = await loadTesseract();
  // Prefer the sparse-text worker (better on scattered UI text); fall back to
  // the simple recognize() if the worker API isn't available.
  const worker = await getWorker();
  const recognize = (img: unknown): Promise<TData> =>
    worker ? worker.recognize(img).then((r) => r.data) : Tesseract.recognize(img, "eng").then((r) => r.data);

  const capturedAt = file.lastModified || Date.now();
  try {
    const processed = await preprocess(file);
    let result = assembleResult(await recognize(processed), capturedAt);
    // Dark / low-contrast screenshots can be crushed by the levels curve — if
    // the processed image read nothing, retry once on the raw file (Tesseract's
    // own binarization) before giving up.
    if (!result.readAnything && processed !== file) {
      try {
        const retry = assembleResult(await recognize(file), capturedAt);
        if (retry.readAnything) result = retry;
      } catch {
        /* keep the first result */
      }
    }
    return result;
  } finally {
    scheduleWorkerCleanup();
  }
}
