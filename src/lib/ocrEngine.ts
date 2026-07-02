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
  recognize: (image: unknown, opts?: unknown, output?: Record<string, boolean>) => Promise<{ data: TData }>;
  terminate?: () => Promise<unknown>;
}
interface TesseractGlobal {
  recognize: (image: unknown, lang?: string, options?: unknown) => Promise<{ data: TData }>;
  createWorker?: (
    lang?: string,
    oem?: number,
    options?: unknown,
    /** Init-time engine config (dawg switches CANNOT go through setParameters). */
    config?: Record<string, string>,
  ) => Promise<TWorker>;
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

const CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
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
    s.onload = () => (window.Tesseract ? resolve(window.Tesseract) : reject(new Error("OCR engine failed to load")));
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
 * A reused worker. The dictionary/language model is disabled at INIT time (so
 * it doesn't "spellcheck" Pokémon names into real words — and because passing
 * dawg switches to setParameters rejects, which would silently lose every
 * tuned parameter). PSM is set per recognize() call: the scanner runs both a
 * sparse-text pass and an auto-layout pass and merges them.
 */
async function getWorker(): Promise<TWorker | null> {
  const T = await loadTesseract();
  if (!T.createWorker) return null;
  if (!workerP) {
    workerP = (async () => {
      try {
        const w = await T.createWorker!("eng", 1, undefined, {
          load_system_dawg: "0",
          load_freq_dawg: "0",
        });
        await w.setParameters({
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
// recreates it (fast — the WASM and LSTM weights stay in the browser cache).
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
 * Preload the OCR engine — the script, WASM core, and LSTM language model are
 * a few MB of downloads that would otherwise stall the first scan. Called
 * while the app's loading screen is up; failures are ignored (scanning
 * performs its own load when actually needed).
 */
export function warmupOcr(): void {
  if (typeof window === "undefined") return;
  getWorker()
    .then(() => scheduleOcrCleanup())
    .catch(() => {});
}

/** Separable box dilation of a binary mask (radius r), used to grow the
 *  colorful-pixel mask over its anti-aliased rims. */
function dilateMask(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  const tmp = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (!mask[row + x]) continue;
      const e = Math.min(w - 1, x + r);
      for (let i = Math.max(0, x - r); i <= e; i++) tmp[row + i] = 1;
    }
  }
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (!tmp[row + x]) continue;
      const e = Math.min(h - 1, y + r);
      for (let i = Math.max(0, y - r); i <= e; i++) out[i * w + x] = 1;
    }
  }
  return out;
}

// preprocess() renders to a canvas; reuse it across the two PSM passes, then
// free it EXPLICITLY via releasePreprocessed() — iOS Safari has hard canvas
// and page memory budgets, and a batch of retained ~15-20MB canvases gets the
// whole tab killed and reloaded.
const prepCache = new WeakMap<File, HTMLCanvasElement | File>();

/** Free a screenshot's cached preprocessing canvas (zeroing releases the
 *  backing store immediately instead of waiting for GC). */
export function releasePreprocessed(file: File): void {
  const cached = prepCache.get(file);
  prepCache.delete(file);
  if (cached && cached !== file && typeof (cached as HTMLCanvasElement).getContext === "function") {
    const c = cached as HTMLCanvasElement;
    c.width = 0;
    c.height = 0;
  }
}

/**
 * Preprocess for OCR: grayscale + strong contrast (whitening the colorful photo
 * header, keeping the dark stat text crisp) so a *full* screenshot reads as well
 * as a tight crop — no fragile fixed cropping. Falls back to the raw file if the
 * canvas pipeline is unavailable.
 */
async function preprocess(file: File): Promise<HTMLCanvasElement | File> {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return file;
  const cached = prepCache.get(file);
  if (cached) return cached;
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
    // Two rules tuned for the PoGo stat card (thresholds validated by running
    // the production engine against the real screenshot corpus):
    //  - COLORFUL pixels — and everything within a few px of them — are erased
    //    to white: resource icons, buttons, badges and the photo header. The
    //    dilation matters: erasing only the saturated core leaves a neutral
    //    anti-aliased rim that OCR reads as a digit ("236" -> "1236").
    //  - Remaining NEUTRAL pixels go through a levels curve mapping
    //    [150..225] -> [0..255] so the gray labels darken to readable black
    //    while the card stays white.
    const mask = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const chroma = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
      // 56, not lower: browsers color-manage Display-P3 screenshots into sRGB,
      // which amplifies the JPEG chroma fringe on dark digit edges to ~47 —
      // a lower threshold makes the mask eat the digits themselves.
      if (chroma > 56) mask[p] = 1;
    }
    const dilated = dilateMask(mask, w, h, 4);
    const Bp = 150;
    const Wp = 225;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      let v: number;
      if (dilated[p]) {
        v = 255;
      } else {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        v = ((lum - Bp) / (Wp - Bp)) * 255;
        v = v < 0 ? 0 : v > 255 ? 255 : v;
      }
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(img, 0, 0);
    prepCache.set(file, canvas);
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
      for (const p of b.paragraphs ?? []) for (const l of p.lines ?? []) for (const w of l.words ?? []) raw.push(w);
  }
  return raw.filter((w) => w.bbox && w.text.trim()).map((w) => ({ text: w.text.trim(), ...w.bbox! }));
}

/**
 * OCR one image. By default the levels preprocess is applied; pass `raw: true`
 * to read the untouched file (Tesseract's own binarization) — useful as a
 * retry when a dark/low-contrast image is crushed by the levels curve.
 *
 * `psm` selects the page-segmentation mode per pass: "11" (sparse text) finds
 * scattered stat cells that auto layout misses; "3" (auto) catches tiny
 * fragments — like a wrapped "XL" line — that sparse mode skips. The scanner
 * runs both and merges.
 */
export async function ocrImage(file: File, opts?: { raw?: boolean; psm?: "3" | "11" }): Promise<OcrPage> {
  const T = await loadTesseract();
  const worker = await getWorker();
  const input = opts?.raw ? file : await preprocess(file);
  let data: TData;
  if (worker) {
    await worker.setParameters({ tessedit_pageseg_mode: opts?.psm ?? "11" });
    data = (await worker.recognize(input, {}, { blocks: true, text: true })).data;
  } else {
    data = (await T.recognize(input, "eng")).data;
  }
  return { words: collectWords(data), text: data.text || "", preprocessed: input !== file };
}
