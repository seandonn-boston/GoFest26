// Resolve a path under public/ to a URL that works both at the site root and
// under a GitHub Pages subpath. Next.js auto-prefixes basePath for next/image and
// <Link>, but NOT for plain <img src> or <link rel="preload"> — so prefix those
// with the build-time NEXT_PUBLIC_BASE_PATH here.

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Two hardcoded example screenshots for the importer guide (full resolution). */
export const GUIDE_IMAGES = {
  card: "/help/screenshot-pokemon-card.jpeg",
  megaLevel: "/help/screenshot-mega-level.jpeg",
} as const;

/** Prefix a public/ path with the deploy base path. */
export function assetPath(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE}${p}`;
}
