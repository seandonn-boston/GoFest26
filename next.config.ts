import type { NextConfig } from "next";

// When building for GitHub Pages we produce a fully static export served from a
// repo subpath (e.g. /GoFest26). On other hosts (Vercel, local) none of this
// applies and the app is served from the root as a normal Next.js app.
const isPages = process.env.GITHUB_PAGES === "true";
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Expose the deploy base path to client code so plain <img>/preload tags can
  // address files in public/ correctly under a GitHub Pages subpath.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  ...(isPages
    ? {
        output: "export",
        images: { unoptimized: true },
        basePath,
        assetPrefix: basePath || undefined,
      }
    : {}),
};

export default nextConfig;
