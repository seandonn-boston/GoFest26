import { ImageResponse } from "next/og";
import { SubstituteSprite } from "@/lib/substituteSprite";

export const dynamic = "force-static"; // required for the static-export (Pages) build
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Favicon: the floating Substitute voxel from the loading screen, on the app's
// dark plum backdrop — matches the brand far better than a flat "26".
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(120% 120% at 30% 0%, #241043 0%, #0b0712 60%, #050507 100%)",
        }}
      >
        <SubstituteSprite cell={5} />
      </div>
    ),
    { ...size },
  );
}
