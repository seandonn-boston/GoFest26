// The app's brand mark: a big "26" over a small "GO FEST", on a violet→pink
// gradient tile. Used by the favicon, the iOS/Android home-screen icons, the PWA
// install icon and the social card — a simple, legible logo (no Substitute
// sprite). Rendered by Satori (next/og ImageResponse), so it's plain inline
// styles only and every element with text/children carries display:flex.

const GRADIENT = "linear-gradient(150deg, #a78bfa 0%, #c026d3 52%, #ec4899 100%)";
const INK = "#1a0b2e"; // dark plum text — high contrast on the bright gradient

/** Square brand tile sized to `px`; pass `radius` for an embedded (non-OS-masked) tile. */
export function BrandMark({ px, radius = 0 }: { px: number; radius?: number }) {
  return (
    <div
      style={{
        width: px,
        height: px,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: Math.round(px * 0.01),
        borderRadius: radius,
        background: GRADIENT,
        fontFamily: "sans-serif",
        color: INK,
      }}
    >
      <div style={{ display: "flex", fontSize: Math.round(px * 0.46), fontWeight: 800, lineHeight: 1 }}>26</div>
      <div
        style={{
          display: "flex",
          fontSize: Math.round(px * 0.145),
          fontWeight: 700,
          letterSpacing: Math.max(1, Math.round(px * 0.02)),
        }}
      >
        GO FEST
      </div>
    </div>
  );
}
