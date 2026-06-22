import { ImageResponse } from "next/og";
import { SubstituteSprite } from "@/lib/substituteSprite";

export const dynamic = "force-static"; // required for the static-export (Pages) build
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: the Substitute voxel on the brand backdrop, with a small
// label so it's identifiable in a grid of apps.
export default function AppleIcon() {
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
          gap: 8,
          fontFamily: "sans-serif",
          background: "radial-gradient(130% 130% at 30% 0%, #2a1248 0%, #0b0712 60%, #050507 100%)",
        }}
      >
        <SubstituteSprite cell={10} />
        <div
          style={{
            display: "flex",
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 3,
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
