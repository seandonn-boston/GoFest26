import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GO Fest 2026 Raid Planner",
  description:
    "Plan your Pokémon GO Fest 2026 raids: figure out how many raids you need to max out your Pokémon's XL Candy and Mega Energy — including Mega Mewtwo X & Y.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1020",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="text-slate-100 antialiased">{children}</body>
    </html>
  );
}
