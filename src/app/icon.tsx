import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brandMark";

export const dynamic = "force-static"; // required for the static-export (Pages) build
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Favicon: the "26 · GO FEST" brand tile.
export default function Icon() {
  return new ImageResponse(<BrandMark px={64} />, { ...size });
}
