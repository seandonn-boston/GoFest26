import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "@/components/pwa/RegisterServiceWorker";

const TITLE = "GO Fest 2026 Raid Planner";
const DESCRIPTION =
  "Plan your Pokémon GO Fest 2026 raids: figure out exactly how many raids you need to max out your Pokémon's XL Candy and Mega Energy — including the debut of Mega Mewtwo X & Y.";

// The app is served under a subpath (e.g. /go-fest-raid-planner). Next doesn't
// prefix the generated metadata image/url tags with basePath, so do it here.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const OG_IMAGE = `${BASE}/og`;

export const metadata: Metadata = {
  metadataBase: new URL("https://seandonn.io"),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: TITLE,
  // Not listed on search engines yet — intentionally suppressed for now.
  robots: { index: false, follow: false },
  icons: { icon: `${BASE}/icon`, apple: `${BASE}/apple-icon` },
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    url: BASE || "/",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: TITLE }],
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="text-slate-100 antialiased">
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
