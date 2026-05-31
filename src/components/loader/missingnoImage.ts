import type { Voxel } from "./voxelData";

// Decode the real MissingNo sprite into a flat (depth = 1) voxel grid in the
// browser: load the image (via a CORS-enabled proxy so canvas pixels are
// readable), find its content bounds, detect the pixel-art block size, then
// sample each block's color. Returns null on any failure (caller falls back to
// the bundled transcription).
const SOURCE = "static.wikia.nocookie.net/gaming-urban-legends/images/7/7c/MissingNo..webp/revision/latest?cb=20210429173552";
const PROXY = `https://images.weserv.nl/?output=png&url=${encodeURIComponent(SOURCE)}`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const hex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

export async function decodeMissingnoVoxels(): Promise<Voxel[] | null> {
  try {
    if (typeof document === "undefined") return null;
    const img = await loadImage(PROXY);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return null;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, w, h); // throws if tainted

    const at = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      return [data[i], data[i + 1], data[i + 2], data[i + 3]] as const;
    };
    const whiteish = (x: number, y: number) => {
      const [r, g, b, a] = at(x, y);
      return a < 100 || (r > 235 && g > 235 && b > 235);
    };

    // Background = white/transparent pixels connected to the image border
    // (flood fill). The top-left notch and outer margins are background; white
    // pixels *enclosed* by the shape are kept as solid white blocks.
    const bg = new Uint8Array(w * h);
    const stack: number[] = [];
    const push = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const idx = y * w + x;
      if (bg[idx] || !whiteish(x, y)) return;
      bg[idx] = 1;
      stack.push(idx);
    };
    for (let x = 0; x < w; x++) {
      push(x, 0);
      push(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      push(0, y);
      push(w - 1, y);
    }
    while (stack.length) {
      const idx = stack.pop()!;
      const x = idx % w;
      const y = (idx / w) | 0;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }
    const isShape = (x: number, y: number) => bg[y * w + x] === 0;

    // Bounding box of the shape.
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (isShape(x, y)) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < x0) return null;
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;

    // Detect the block (cell) size from color-change run lengths.
    let cell = 1;
    if (bw > 40) {
      const gaps: number[] = [];
      const d = (a: readonly number[], b: readonly number[]) =>
        Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) + Math.abs(a[3] - b[3]);
      const scan = (horizontal: boolean) => {
        const lines = 6;
        const span = horizontal ? bw : bh;
        const start = horizontal ? x0 : y0;
        for (let li = 1; li <= lines; li++) {
          const fixed = horizontal
            ? y0 + Math.floor((bh * li) / (lines + 1))
            : x0 + Math.floor((bw * li) / (lines + 1));
          let prev = horizontal ? at(start, fixed) : at(fixed, start);
          let last = 0;
          for (let k = 1; k < span; k++) {
            const cur = horizontal ? at(start + k, fixed) : at(fixed, start + k);
            if (d(cur, prev) > 60) {
              const gap = k - last;
              if (gap >= 4 && gap <= 60) gaps.push(gap);
              last = k;
            }
            prev = cur;
          }
        }
      };
      scan(true);
      scan(false);
      if (gaps.length) {
        gaps.sort((a, b) => a - b);
        cell = gaps[Math.floor(gaps.length / 2)]; // median gap ≈ block size
      }
      cell = Math.max(2, Math.min(cell, 64));
    }

    const cols = Math.max(1, Math.round(bw / cell));
    const rows = Math.max(1, Math.round(bh / cell));
    const cw = bw / cols;
    const ch = bh / rows;

    const voxels: Voxel[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sx = Math.min(w - 1, Math.round(x0 + (c + 0.5) * cw));
        const sy = Math.min(h - 1, Math.round(y0 + (r + 0.5) * ch));
        if (!isShape(sx, sy)) continue; // notch + outside skipped; interior whites kept
        const [rr, gg, bb] = at(sx, sy);
        voxels.push({
          position: [c - (cols - 1) / 2, rows - 1 - r - (rows - 1) / 2, 0],
          color: hex(rr, gg, bb),
        });
      }
    }
    return voxels.length > 8 ? voxels : null;
  } catch {
    return null;
  }
}
