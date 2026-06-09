/**
 * Downscale an uploaded screenshot to a compact JPEG data URL — small enough to
 * persist in localStorage (so card previews survive a refresh) yet legible enough
 * to eyeball the Candy / XL / Energy numbers. Used for the import-row thumbnails
 * and the per-card preview.
 */
export async function makeThumbnail(file: File, max = 360, quality = 0.55): Promise<string | null> {
  try {
    let bmp: ImageBitmap;
    try {
      bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      bmp = await createImageBitmap(file);
    }
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return null;
  }
}
