import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brandMark";

export const dynamic = "force-static"; // required for the static-export (Pages) build
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: the "26 · GO FEST" brand tile (iOS masks the corners).
export default function AppleIcon() {
  return new ImageResponse(<BrandMark px={180} />, { ...size });
}
