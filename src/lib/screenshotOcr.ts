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
    s.onerror = () => reject(new Error("Couldn't load the OCR engine (are you offline?)"));
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

export interface StatEntry {
  kind: "candy" | "xlCandy" | "energy";
  species: string;
  value: number;
  /** Vertical position (for ordering Mewtwo's X-then-Y energies). */
  y: number;
}

export interface ScanResult {
  /** Normalized species (lowercase letters), from the energy/candy label. */
  species: string | null;
  candy?: number;
  xlCandy?: number;
  /** Mega/Primal energies, top-to-bottom (Mewtwo lists X then Y). */
  megaEnergies: number[];
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
const isStopW = (a: string) => isCandyW(a) || isEnergyW(a) || isXlW(a) || a === "mega" || a === "primal";

function numVal(text: string): number | null {
  const m = text.replace(/\s/g, "").match(/^[^\d]*(\d[\d,]*)[^\d]*$/);
  if (!m) return null;
  const n = parseInt(m[1].replace(/,/g, ""), 10);
  // No upper cap — Stardust can reach the billions, and OCR may add digits.
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Flatten word boxes across Tesseract's various data shapes. */
function collectWords(data: TData): Word[] {
  const raw: TWord[] = [];
  if (data.words?.length) raw.push(...data.words);
  for (const b of data.blocks ?? [])
    for (const p of b.paragraphs ?? [])
      for (const l of p.lines ?? []) for (const w of l.words ?? []) raw.push(w);
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
    entries.push({ kind: "energy", species: speciesLeftOf(words, e), value, y: cy(e) });
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
 * Stardust is the largest number and anchors the grid; CP/HP/weight are dropped
 * by keeping only the lower portion of the image.
 */
export function parseByGrid(words: Word[]): GridValues | null {
  if (words.length === 0) return null;
  const H = Math.max(...words.map((w) => w.y1), 1);
  const toks: NumTok[] = words
    .map((w) => {
      const v = numVal(w.text);
      return v === null ? null : { value: v, x: cx(w), y: cy(w), h: w.y1 - w.y0 || 18 };
    })
    .filter((t): t is NumTok => t !== null)
    .filter((t) => t.y > H * 0.4); // stats live in the lower portion
  if (toks.length < 2) return null;

  const stardust = toks.reduce((a, b) => (b.value > a.value ? b : a));
  if (stardust.value < 1000) return null; // need a plausible Stardust anchor
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
      if (n !== null) pending = n;
      continue;
    }
    const value = n ?? pending ?? undefined;
    pending = null;
    if (value === undefined) continue;
    const m = lower.replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
    if (/cand/.test(m) && /\bxl?\b|xi/.test(m)) entries.push({ kind: "xlCandy", species: m.split(/\s+cand/)[0].trim(), value, y: y++ });
    else if (/ener/.test(m)) entries.push({ kind: "energy", species: m.split(/\s+(mega|primal|ener)/)[0].trim(), value, y: y++ });
    else if (/cand/.test(m)) entries.push({ kind: "candy", species: m.split(/\s+cand/)[0].trim(), value, y: y++ });
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

export function aggregateEntries(entries: StatEntry[], capturedAt: number, rawText = ""): ScanResult {
  const candy = entries.find((e) => e.kind === "candy")?.value;
  const xlCandy = entries.find((e) => e.kind === "xlCandy")?.value;
  const energy = entries.filter((e) => e.kind === "energy").sort((a, b) => a.y - b.y);
  const speciesRaw = energy[0]?.species || entries.find((e) => e.kind === "candy" || e.kind === "xlCandy")?.species || "";
  return {
    species: normSpecies(speciesRaw) || null,
    candy,
    xlCandy,
    megaEnergies: energy.map((e) => e.value),
    capturedAt,
    readAnything: entries.length > 0,
    rawText: rawText.replace(/\s+/g, " ").trim().slice(0, 300),
  };
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
    const bitmap = await createImageBitmap(file);
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

export async function scanScreenshot(file: File): Promise<ScanResult> {
  const Tesseract = await loadTesseract();
  const image = await preprocess(file);
  // Prefer the sparse-text worker (better on scattered UI text); fall back to
  // the simple recognize() if the worker API isn't available.
  const worker = await getWorker();
  const { data } = worker ? await worker.recognize(image) : await Tesseract.recognize(image, "eng");
  const words = collectWords(data);
  const capturedAt = file.lastModified || Date.now();

  // Labels are best-effort (OCR garbles them) — used only for SPECIES.
  let labelEntries = parseEntries(words);
  if (!labelEntries.length) labelEntries = parseEntriesFromText(data.text);
  const fromLabels = aggregateEntries(labelEntries, capturedAt, data.text || "");

  // Snap the species to the roster vocabulary (tolerates OCR slips); fall back
  // to the raw label species only if nothing matches.
  const species = fuzzyMatchSpecies(data.text || "", ROSTER_VOCAB) ?? fromLabels.species;

  // VALUES come from the NUMBERS, which OCR reliably: by word position (grid)
  // when boxes exist, else by text reading order. This is primary so a garbled
  // label can't duplicate one value across Candy/XL/Energy.
  const grid = parseByGrid(words) ?? parseByTextOrder(data.text || "");
  const candy = grid?.candy ?? fromLabels.candy;
  const xlCandy = grid?.xlCandy ?? fromLabels.xlCandy;
  const megaEnergies = grid && grid.megaEnergies.length ? grid.megaEnergies : fromLabels.megaEnergies;

  return {
    species,
    candy,
    xlCandy,
    megaEnergies,
    capturedAt,
    readAnything: candy !== undefined || xlCandy !== undefined || megaEnergies.length > 0,
    rawText: fromLabels.rawText,
  };
}
