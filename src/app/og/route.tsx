import { ImageResponse } from "next/og";

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
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 88px",
          background:
            "radial-gradient(1100px 600px at 18% -10%, #2a1248 0%, #0b0712 55%, #050507 100%)",
          color: "#f1f5f9",
          fontFamily: "sans-serif",
        }}
      >
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
            marginTop: 18,
            fontSize: 124,
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
            marginTop: 26,
            maxWidth: 940,
            fontSize: 36,
            lineHeight: 1.32,
            color: "#cbd5e1",
          }}
        >
          Exactly how many raids to max your XL Candy &amp; Mega Energy — including the debut of
          Mega Mewtwo X &amp; Y.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 48,
            fontSize: 30,
            fontWeight: 700,
            color: "#94a3b8",
          }}
        >
          seandonn.io/go-fest-raid-planner
        </div>
      </div>
    ),
    { ...size },
  );
}
