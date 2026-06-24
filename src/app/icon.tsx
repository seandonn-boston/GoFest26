import { ImageResponse } from "next/og";
import { MewtwoMark } from "@/lib/brandMark";

export const dynamic = "force-static"; // required for the static-export (Pages) build
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Favicon: Mega Mewtwo Y (the icon surfaces alternate Y / X).
export default function Icon() {
  return new ImageResponse(<MewtwoMark px={64} form="y" />, { ...size });
}
