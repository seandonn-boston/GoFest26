// Flat pixel-art of the floating voxel Substitute from the loading screen — its
// sage-green body, white belly, dark stitch outline and two eyes — rebuilt as a
// grid of cells so it can render in next/og (Satori) for the app icons and the
// social card. Colors mirror the WebGL sculpt's PALETTE in SubstituteLoaderScreen.
const FILL: Record<string, string> = {
  o: "#24281f", // stitch outline (PALETTE.LINE)
  g: "#9fbe81", // body green (PALETTE.GREEN)
  w: "#f6f2e4", // belly white (PALETTE.WHITE)
  e: "#10130d", // eyes
};

// 11 columns × 12 rows. "." = transparent (lets the backdrop show through).
const SPRITE = [
  "....ooo....",
  "...ogggo...",
  "..ogggggo..",
  ".ogggggggo.",
  "ogggggggggo",
  "oggegggeggo",
  "ogggggggggo",
  "oggwwwwwggo",
  ".oggwwwggo.",
  ".ogggggggo.",
  "..oggoggo..",
  "..oo..oo...",
];

export const SPRITE_COLS = 11;
export const SPRITE_ROWS = SPRITE.length;

/** The Substitute doll as a grid of `cell`-sized blocks. */
export function SubstituteSprite({ cell }: { cell: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {SPRITE.map((row, y) => (
        <div key={y} style={{ display: "flex" }}>
          {row.split("").map((ch, x) => (
            <div key={x} style={{ width: cell, height: cell, background: FILL[ch] ?? "transparent" }} />
          ))}
        </div>
      ))}
    </div>
  );
}
