import { ImageResponse } from "next/og";
import { MewtwoMark } from "@/lib/brandMark";

export const dynamic = "force-static"; // required for the static-export (Pages) build
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: Mega Mewtwo X (alternates with the favicon's Y; iOS masks the corners).
export default function AppleIcon() {
  return new ImageResponse(<MewtwoMark px={180} form="x" />, { ...size });
}
