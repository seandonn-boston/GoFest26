import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";

const TITLE = "GO Fest 2026 Raid Planner";
const DESCRIPTION =
  "Plan your Pokémon GO Fest 2026 raids: figure out exactly how many raids you need to max out your Pokémon's XL Candy and Mega Energy — including the debut of Mega Mewtwo X & Y.";

// The app is served under a subpath (e.g. /go-fest-raid-planner). Next doesn't
// prefix the generated metadata image/url tags with basePath, so do it here.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
// The real host serving this build — social scrapers need ABSOLUTE image URLs
// that resolve, so this must match the deploy host (set in next.config.ts), not
// a hardcoded one. A wrong host is why the share card fell back to a generic globe.
const ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://seandonn.io";
const OG_IMAGE = `${BASE}/og`;

export const metadata: Metadata = {
  metadataBase: new URL(ORIGIN),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: TITLE,
  // Not listed on search engines yet — intentionally suppressed for now. (Social
  // scrapers ignore robots, so share cards still render.)
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: `${BASE}/icon`, sizes: "64x64", type: "image/png" },
      { url: `${BASE}/icon-512`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `${BASE}/apple-icon`, sizes: "180x180", type: "image/png" }],
  },
  manifest: `${BASE}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: "GO Fest Planner", statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    url: BASE || "/",
    locale: "en_US",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: TITLE, type: "image/png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050507",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="text-slate-100 antialiased">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
