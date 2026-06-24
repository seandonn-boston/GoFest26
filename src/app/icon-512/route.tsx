import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brandMark";

// Large app icon (512×512) for the PWA manifest / Android install + as a
// high-res favicon — the "26 · GO FEST" brand tile. A plain route (not the
// `icon` convention) so the manifest can reference it under the deploy base path.
export const dynamic = "force-static";

const size = { width: 512, height: 512 };

export function GET() {
  return new ImageResponse(<BrandMark px={512} />, { ...size });
}
