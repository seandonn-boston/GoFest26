// Voxel model for the loader: MissingNo, a flat glitch sprite (depth = 1).

export interface Voxel {
  position: [number, number, number];
  color: string;
}

// ---------------- MissingNo fallback (flat, depth = 1) ----------------
// One solid contained shape: a rectangle with the top-left notch cut out. Every
// cell inside the shape is a block (colored or white) — no transparent gaps;
// only the notch and outside are empty. Used if the live image decode is
// blocked. P purple, K black, T peach, W white interior.
const MN_P = "#9b8cb1";
const MN_K = "#20212c";
const MN_T = "#e9c9a1";
const MN_W = "#f1f1f4";
const MN_COLS = 14;
const MN_ROWS = 34;
const MN_NOTCH_W = 7; // top-left notch width
const MN_NOTCH_H = 13; // top-left notch height

function mnHash(x: number, y: number): number {
  let h = (x * 73856093) ^ (y * 19349663);
  h = (h ^ (h >>> 13)) >>> 0;
  return (h % 1000) / 1000;
}

function mnBlockColor(x: number, y: number): string {
  const r = mnHash(x, y);
  const row = (y * 2654435 + 5) % 6;
  if (r < 0.1) return MN_W; // interior white blocks
  if (row === 0 && r < 0.55) return MN_T;
  if (row === 1 && r < 0.45) return MN_K;
  if (r < 0.18) return MN_K;
  if (r < 0.3) return MN_T;
  return MN_P;
}

function buildMissingno(): Voxel[] {
  const out: Voxel[] = [];
  for (let y = 0; y < MN_ROWS; y++) {
    for (let x = 0; x < MN_COLS; x++) {
      if (x < MN_NOTCH_W && y < MN_NOTCH_H) continue; // top-left notch cutout
      out.push({
        position: [x - (MN_COLS - 1) / 2, MN_ROWS - 1 - y - (MN_ROWS - 1) / 2, 0],
        color: mnBlockColor(x, y),
      });
    }
  }
  return out;
}

export const MISSINGNO_VOXELS = buildMissingno();
