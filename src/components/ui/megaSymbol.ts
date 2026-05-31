// Extract the Mega Evolution symbol silhouette from the reference image in the
// browser: load it (CORS proxy), keep the high-chroma "rainbow" pixels as the
// symbol (ignoring the black box + light background), and return a cropped
// white-on-transparent mask data URL. Cached so it runs once for all tiles.
const SOURCE = "ih1.redbubble.net/image.4851243487.6970/pp,840x830-pad,1000x1000,f8f8f8.u1.jpg";
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

async function extract(): Promise<string | null> {
  try {
    if (typeof document === "undefined") return null;
    const img = await loadImage(PROXY);
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return null;

    const scale = Math.min(1, 380 / Math.max(nw, nh));
    const w = Math.round(nw * scale);
    const h = Math.round(nh * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    // Symbol = saturated (colorful) pixel; black box and grey padding are not.
    const isSym = (i: number) => {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 60) return false;
      return Math.max(r, g, b) - Math.min(r, g, b) > 45;
    };

    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (isSym((y * w + x) * 4)) {
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

    const mask = document.createElement("canvas");
    mask.width = bw;
    mask.height = bh;
    const mctx = mask.getContext("2d");
    if (!mctx) return null;
    const out = mctx.createImageData(bw, bh);
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        if (isSym(((y + y0) * w + (x + x0)) * 4)) {
          const di = (y * bw + x) * 4;
          out.data[di] = 255;
          out.data[di + 1] = 255;
          out.data[di + 2] = 255;
          out.data[di + 3] = 255;
        }
      }
    }
    mctx.putImageData(out, 0, 0);
    return mask.toDataURL("image/png");
  } catch {
    return null;
  }
}

let cache: Promise<string | null> | undefined;

export function getMegaSymbolMask(): Promise<string | null> {
  cache ??= extract();
  return cache;
}
