// Shared guards for user-uploaded screenshots (used by the per-card scanner and
// the bulk importer). Kept tiny and dependency-free — we can't npm-install a
// HEIC decoder in this environment, so HEIC is handled with clear messaging.

/** Largest image we'll attempt to decode before the canvas/OCR step. */
export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

/** A pre-flight rejection message for an upload, or null if it's fine to try. */
export function uploadError(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That image is ${Math.round(file.size / 1e6)} MB — too large to scan. Crop it or pick a smaller screenshot.`;
  }
  return null;
}

/** HEIC/HEIF can't be decoded by canvas in most non-Safari browsers. */
export function looksHeic(file: File): boolean {
  return /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

export const HEIC_HINT =
  "Couldn't decode this image. If it's a HEIC photo from an iPhone, take a screenshot of it (or export it as JPEG) and upload that instead.";
