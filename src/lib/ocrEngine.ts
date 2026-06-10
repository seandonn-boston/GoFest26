// Game-agnostic OCR engine. Tesseract.js is loaded from a CDN at runtime (the
// build env can't install npm packages, and this keeps OCR entirely in the
// user's browser — no upload, no backend). Output is normalized to plain
// words-with-boxes; everything Pokémon-GO-specific lives in screenshotScan.

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

export interface OcrWord {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrPage {
  words: OcrWord[];
  text: string;
  /** Whether the canvas levels preprocess was applied (false = raw file). */
  preprocessed: boolean;
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
export function scheduleOcrCleanup() {
  if (typeof window === "undefined") return;
  if (workerIdleTimer) clearTimeout(workerIdleTimer);
  workerIdleTimer = setTimeout(() => {
    const pending = workerP;
    workerP = null;
    workerIdleTimer = null;
    pending?.then((w) => w?.terminate?.()).catch(() => {});
  }, 60_000);
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
    // Downscale huge images for speed; upscale small ones — Tesseract reads the
    // thin stat font noticeably better with some extra pixels.
    const maxW = 1600;
    const minW = 1200;
    const scale = bitmap.width > maxW ? maxW / bitmap.width : bitmap.width < minW ? Math.min(2, minW / bitmap.width) : 1;
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
    // Two rules tuned for the PoGo stat card:
    //  - COLORFUL pixels (high chroma) are erased to white: resource icons,
    //    buttons, badges and the photo header. Otherwise a dark icon fuses into
    //    the digits beside it and OCR eats or invents leading digits
    //    ("81" -> "S1", "2,230" -> "92,230").
    //  - NEUTRAL pixels go through a levels curve mapping [150..225] -> [0..255]
    //    so the gray labels darken to readable black while the card stays white.
    const Bp = 150;
    const Wp = 225;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      let v: number;
      if (chroma > 60) {
        v = 255;
      } else {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        v = ((lum - Bp) / (Wp - Bp)) * 255;
        v = v < 0 ? 0 : v > 255 ? 255 : v;
      }
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  } catch {
    return file;
  }
}

/** Word boxes from whichever shape Tesseract provides (NOT both — `data.words`
 *  and `data.blocks` hold the SAME words, so merging double-counts every value).
 *  Reading a single source keeps every distinct stat, even ones that legitimately
 *  share a number (e.g. Energy X 0 and Energy Y 0). */
function collectWords(data: TData): OcrWord[] {
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

/**
 * OCR one image. By default the levels preprocess is applied; pass `raw: true`
 * to read the untouched file (Tesseract's own binarization) — useful as a
 * retry when a dark/low-contrast image is crushed by the levels curve.
 */
export async function ocrImage(file: File, opts?: { raw?: boolean }): Promise<OcrPage> {
  const T = await loadTesseract();
  const worker = await getWorker();
  const recognize = (img: unknown): Promise<TData> =>
    worker ? worker.recognize(img).then((r) => r.data) : T.recognize(img, "eng").then((r) => r.data);
  const input = opts?.raw ? file : await preprocess(file);
  const data = await recognize(input);
  return { words: collectWords(data), text: data.text || "", preprocessed: input !== file };
}
