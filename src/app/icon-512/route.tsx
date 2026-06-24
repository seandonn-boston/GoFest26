import { ImageResponse } from "next/og";
import { SubstituteSprite } from "@/lib/substituteSprite";

// Large app icon (512×512) for the PWA manifest / Android install + as a
// high-res favicon. Same Substitute-on-plum branding as the home-screen icon,
// scaled up. A plain route (not the `icon` convention) so the manifest can
// reference it under the deploy base path. Static for the export build.
export const dynamic = "force-static";

const size = { width: 512, height: 512 };

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          fontFamily: "sans-serif",
          background: "radial-gradient(130% 130% at 30% 0%, #2a1248 0%, #0b0712 60%, #050507 100%)",
        }}
      >
        <SubstituteSprite cell={28} />
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: 8,
            color: "#7CFF6B",
          }}
        >
          GO FEST 26
        </div>
      </div>
    ),
    { ...size },
  );
}
