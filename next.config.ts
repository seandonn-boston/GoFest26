import type { NextConfig } from "next";

// The app is served from a subpath on both hosts:
//   - Production (Vercel): https://seandonn.io/go-fest-raid-planner
//   - GitHub Pages backup:  https://<owner>.github.io/<repo>
// so a base path is applied in every mode except local dev (override BASE_PATH="").
// GitHub Pages additionally needs a fully static export.
const isPages = process.env.GITHUB_PAGES === "true";
const basePath = isPages
  ? process.env.PAGES_BASE_PATH || ""
  : process.env.BASE_PATH ?? "/go-fest-raid-planner";

// The page's own origin, used to build ABSOLUTE social-share URLs (og:image
// etc.) — these must point at the host actually serving the page, or scrapers
// (Reddit/Discord/Facebook/…) can't fetch the card image. Per host, overridable.
const siteOrigin =
  process.env.SITE_ORIGIN || (isPages ? "https://seandonn-boston.github.io" : "https://seandonn.io");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Expose the deploy base path + origin to client code so plain <img>/preload
  // tags and the metadata can address files in public/ correctly under the subpath.
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_SITE_ORIGIN: siteOrigin },
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  ...(isPages ? { output: "export", images: { unoptimized: true } } : {}),
};

export default nextConfig;
