import { ImageResponse } from "next/og";

export const dynamic = "force-static"; // required for the static-export (Pages) build
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
          color: "#050507",
          fontFamily: "sans-serif",
          background: "linear-gradient(135deg, #ff58c4 0%, #b388ff 50%, #56e1ff 100%)",
        }}
      >
        <div style={{ display: "flex", fontSize: 96, fontWeight: 900, lineHeight: 1 }}>26</div>
        <div style={{ display: "flex", marginTop: 6, fontSize: 22, fontWeight: 800, letterSpacing: 3 }}>
          GO FEST
        </div>
      </div>
    ),
    { ...size },
  );
}
