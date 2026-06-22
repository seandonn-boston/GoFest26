import { ImageResponse } from "next/og";
import { SubstituteSprite } from "@/lib/substituteSprite";

// Social-share card served at <base>/og and wired up via metadata.openGraph in
// layout.tsx — a plain route (not the `opengraph-image` file convention) so the
// generated og:image URL keeps the deploy basePath. Static for the export build.
export const dynamic = "force-static";

const size = { width: 1200, height: 630 };

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "64px 72px",
          background:
            "radial-gradient(1100px 600px at 18% -10%, #2a1248 0%, #0b0712 55%, #050507 100%)",
          color: "#f1f5f9",
          fontFamily: "sans-serif",
        }}
      >
        {/* Left: the pitch */}
        <div style={{ display: "flex", flexDirection: "column", width: 720 }}>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              letterSpacing: 8,
              fontWeight: 800,
              textTransform: "uppercase",
              color: "#7CFF6B",
            }}
          >
            Pokémon GO Fest 2026 · Global
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontSize: 110,
              lineHeight: 1.02,
              fontWeight: 900,
              background: "linear-gradient(92deg, #ff58c4 0%, #b388ff 48%, #56e1ff 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Raid Planner
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              maxWidth: 660,
              fontSize: 34,
              lineHeight: 1.3,
              color: "#cbd5e1",
            }}
          >
            Exactly how many raids to max your XL Candy &amp; Mega Energy — including the debut of
            Mega Mewtwo X &amp; Y.
          </div>
          <div style={{ display: "flex", marginTop: 30, alignItems: "center", gap: 20 }}>
            <div
              style={{
                display: "flex",
                padding: "8px 20px",
                borderRadius: 999,
                borderWidth: 2,
                borderStyle: "solid",
                borderColor: "rgba(124,255,107,0.45)",
                color: "#7CFF6B",
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: 2,
              }}
            >
              JUL 11–12, 2026
            </div>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: "#94a3b8" }}>
              seandonn.io/go-fest-raid-planner
            </div>
          </div>
        </div>

        {/* Right: the floating Substitute voxel on its platform */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <SubstituteSprite cell={31} />
          <div
            style={{
              display: "flex",
              marginTop: 14,
              width: 250,
              height: 26,
              borderRadius: 999,
              background: "rgba(111,167,99,0.35)",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
