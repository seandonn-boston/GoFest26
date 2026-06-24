import type { MetadataRoute } from "next";

// PWA manifest so the planner can be added to a phone's home screen. Paths are
// base-path aware (the app is served under /go-fest-raid-planner).
export const dynamic = "force-static"; // required for the static-export (Pages) build

export default function manifest(): MetadataRoute.Manifest {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return {
    name: "GO Fest 2026 Raid Planner",
    short_name: "GO Fest Planner",
    description:
      "Plan your Pokémon GO Fest 2026 raids — how many you need to max XL Candy and Mega Energy.",
    start_url: base || "/",
    scope: base ? `${base}/` : "/",
    display: "standalone",
    background_color: "#050507",
    theme_color: "#050507",
    icons: [
      { src: `${base}/icon`, sizes: "64x64", type: "image/png", purpose: "any" },
      { src: `${base}/apple-icon`, sizes: "180x180", type: "image/png", purpose: "any" },
      // 512 serves the 192 slot (downscaled), the install icon, and the maskable.
      { src: `${base}/icon-512`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icon-512`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/icon-512`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
