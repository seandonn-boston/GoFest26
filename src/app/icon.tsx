import { ImageResponse } from "next/og";

export const dynamic = "force-static"; // required for the static-export (Pages) build
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

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
          fontSize: 38,
          fontWeight: 900,
          color: "#050507",
          fontFamily: "sans-serif",
          background: "linear-gradient(135deg, #ff58c4 0%, #b388ff 50%, #56e1ff 100%)",
        }}
      >
        26
      </div>
    ),
    { ...size },
  );
}
