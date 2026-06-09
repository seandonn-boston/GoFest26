// Client-side OCR for Pokémon GO detail screenshots. Tesseract.js is loaded
// from a CDN at runtime (the build env can't install npm packages, and this
// keeps OCR entirely in the user's browser — no upload, no backend).

interface TesseractWord {
  text: string;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
}
interface TesseractResult {
  data: { text: string; words?: TesseractWord[] };
}
interface TesseractGlobal {
  recognize: (image: unknown, lang?: string, options?: unknown) => Promise<TesseractResult>;
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

export interface ParsedScreenshot {
  candy?: number;
  xlCandy?: number;
  /** Mega/Primal energy values, in top-to-bottom order (Mewtwo lists X then Y). */
  megaEnergies: number[];
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
const numVal = (s: string): number | null => {
  const m = s.replace(/\s/g, "").match(/^[^\d]*(\d[\d,]*)[^\d]*$/);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
};

/** Position-aware parse: each label takes the number directly above it. */
export function parseFromWords(rawWords: TesseractWord[]): ParsedScreenshot {
  const words: Word[] = rawWords
    .filter((w) => w.bbox && w.text.trim())
    .map((w) => ({ text: w.text.trim(), ...w.bbox! }));
  const out: ParsedScreenshot = { megaEnergies: [] };
  if (words.length === 0) return out;

  const width = Math.max(...words.map((w) => w.x1), 1);
  const xTol = width * 0.22;

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

  // XL Candy — anchor on the "xl" token.
  const xl = words.find((w) => alpha(w) === "xl");
  if (xl) out.xlCandy = numberAbove(cx(xl), cy(xl));

  // Plain Candy — a "candy" with no "xl" to its right on the same row.
  for (const c of words.filter((w) => alpha(w) === "candy")) {
    const rowH = c.y1 - c.y0 || 12;
    const hasXlRight = words.some(
      (w) => alpha(w) === "xl" && Math.abs(cy(w) - cy(c)) < rowH && cx(w) > cx(c),
    );
    if (!hasXlRight) {
      out.candy = numberAbove(cx(c), cy(c));
      break;
    }
  }

  // Mega / Primal energy — anchor on each "energy" token, top-to-bottom.
  const energies = words.filter((w) => alpha(w) === "energy").sort((a, b) => cy(a) - cy(b) || cx(a) - cx(b));
  for (const e of energies) {
    const v = numberAbove(cx(e), cy(e));
    if (v !== undefined) out.megaEnergies.push(v);
  }

  return out;
}

/** Fallback parse from plain text (number line precedes its label line). */
export function parseFromText(text: string): ParsedScreenshot {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const out: ParsedScreenshot = { megaEnergies: [] };
  let pending: number | null = null;
  for (const line of lines) {
    const lower = line.toLowerCase();
    const isLabel = /candy\s*xl|candy|mega\s*energy|primal\s*energy/.test(lower);
    const n = numVal(line);
    if (!isLabel) {
      if (n !== null) pending = n;
      continue;
    }
    const value = n ?? pending ?? undefined;
    if (value !== undefined) {
      if (/candy\s*xl/.test(lower)) out.xlCandy = value;
      else if (/mega\s*energy|primal\s*energy/.test(lower)) out.megaEnergies.push(value);
      else if (/candy/.test(lower)) out.candy = value;
    }
    pending = null;
  }
  return out;
}

export async function scanScreenshot(file: File): Promise<ParsedScreenshot> {
  const Tesseract = await loadTesseract();
  const { data } = await Tesseract.recognize(file, "eng");
  const byWords = data.words && data.words.length ? parseFromWords(data.words) : null;
  if (byWords && (byWords.candy !== undefined || byWords.xlCandy !== undefined || byWords.megaEnergies.length)) {
    return byWords;
  }
  return parseFromText(data.text);
}
