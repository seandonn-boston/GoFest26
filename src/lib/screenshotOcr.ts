// Client-side OCR for Pokémon GO detail screenshots. Tesseract.js is loaded
// from a CDN at runtime (the build env can't install npm packages, and this
// keeps OCR entirely in the user's browser — no upload, no backend).
//
// Identification is by the on-screen LABELS ("MEWTWO CANDY", "DRAGONITE MEGA
// ENERGY", "GROUDON PRIMAL ENERGY"), never the sprite or nickname — labels
// survive shinies, poses and nicknames. Numbers (0–999,999) can sit anywhere,
// so every value is taken from the number directly above its label.

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
interface TesseractGlobal {
  recognize: (image: unknown, lang?: string, options?: unknown) => Promise<{ data: TData }>;
}

declare global {
  interface Window {
    Tesseract?: TesseractGlobal;
  }
}

const CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@4.1.4/dist/tesseract.min.js";
let loader: Promise<TesseractGlobal> | null = null;

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
const STOP = new Set(["candy", "xl", "mega", "energy", "primal"]);

function numVal(text: string): number | null {
  const m = text.replace(/\s/g, "").match(/^[^\d]*(\d[\d,]*)[^\d]*$/);
  if (!m) return null;
  const n = parseInt(m[1].replace(/,/g, ""), 10);
  return Number.isFinite(n) && n >= 0 && n <= 999999 ? n : null;
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
    .filter((t) => t.length > 1 && !STOP.has(t))
    .join(" ")
    .trim();
}

/** Position-aware entry parse: each label takes the number directly above it. */
export function parseEntries(words: Word[]): StatEntry[] {
  if (words.length === 0) return [];
  const width = Math.max(...words.map((w) => w.x1), 1);
  const xTol = width * 0.26;
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

  for (const c of words.filter((w) => alpha(w) === "candy")) {
    const rowH = c.y1 - c.y0 || 12;
    const xlRight = words.some((w) => alpha(w) === "xl" && Math.abs(cy(w) - cy(c)) < rowH && cx(w) > cx(c));
    const value = numberAbove(cx(c), cy(c));
    if (value === undefined) continue;
    entries.push({ kind: xlRight ? "xlCandy" : "candy", species: speciesLeftOf(words, c), value, y: cy(c) });
  }

  for (const e of words.filter((w) => alpha(w) === "energy")) {
    const value = numberAbove(cx(e), cy(e));
    if (value === undefined) continue;
    entries.push({ kind: "energy", species: speciesLeftOf(words, e), value, y: cy(e) });
  }

  return entries;
}

/** Text-line fallback (single column only; used when no word boxes exist). */
export function parseEntriesFromText(text: string): StatEntry[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const entries: StatEntry[] = [];
  let pending: number | null = null;
  let y = 0;
  for (const line of lines) {
    const lower = line.toLowerCase();
    const isLabel = /candy|mega\s*energy|primal\s*energy/.test(lower);
    const n = numVal(line);
    if (!isLabel) {
      if (n !== null) pending = n;
      continue;
    }
    const value = n ?? pending ?? undefined;
    pending = null;
    if (value === undefined) continue;
    const m = lower.replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
    if (/candy\s*xl/.test(m)) entries.push({ kind: "xlCandy", species: m.split(/\s+candy/)[0].trim(), value, y: y++ });
    else if (/mega\s*energy|primal\s*energy/.test(m))
      entries.push({ kind: "energy", species: m.split(/\s+(mega|primal)/)[0].trim(), value, y: y++ });
    else if (/candy/.test(m)) entries.push({ kind: "candy", species: m.split(/\s+candy/)[0].trim(), value, y: y++ });
  }
  return entries;
}

const normSpecies = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

export function aggregateEntries(entries: StatEntry[], capturedAt: number): ScanResult {
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
  };
}

export async function scanScreenshot(file: File): Promise<ScanResult> {
  const Tesseract = await loadTesseract();
  const { data } = await Tesseract.recognize(file, "eng");
  const words = collectWords(data);
  let entries = parseEntries(words);
  if (!entries.length) entries = parseEntriesFromText(data.text);
  return aggregateEntries(entries, file.lastModified || Date.now());
}
