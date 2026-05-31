// Voxel models. The Substitute is built volumetrically (a chunky plushie with
// real depth); MissingNo is an extruded glitch sprite.

export interface Voxel {
  position: [number, number, number];
  color: string;
}

// ---------------- Substitute plushie (green, white belly, eared) ----------------
const SUB_BODY = "#93b86a";
const SUB_DARK = "#34432a";
const SUB_BELLY = "#f2f3ea";
const SUB_HILITE = "#fbfdff";

function buildSubstitute(): Voxel[] {
  const map = new Map<string, string>();
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const add = (x: number, y: number, z: number, c: string) =>
    map.set(key(Math.round(x), Math.round(y), Math.round(z)), c);

  const rx = 5;
  const ry = 5;
  const rz = 4;

  // Rounded body (squashed ellipsoid) with a white belly on the lower front.
  for (let x = -rx; x <= rx; x++) {
    for (let y = -ry; y <= ry; y++) {
      for (let z = -rz; z <= rz; z++) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) + (z * z) / (rz * rz) <= 1) {
          const belly = z > rz * 0.25 && (x * x) / 8 + ((y + 2) * (y + 2)) / 10 <= 1 && y <= 0.5;
          add(x, y, z, belly ? SUB_BELLY : SUB_BODY);
        }
      }
    }
  }

  // Tapering discs stacked upward → two pointy ears, with depth.
  const ear = (cx: number) => {
    const layers = [
      { y: ry - 1, r: 1.7 },
      { y: ry, r: 1.3 },
      { y: ry + 1, r: 0.9 },
      { y: ry + 2, r: 0.5 },
    ];
    for (const L of layers) {
      for (let x = -2; x <= 2; x++) {
        for (let z = -2; z <= 2; z++) {
          if (x * x + z * z <= L.r * L.r) add(cx + x, L.y, z, SUB_BODY);
        }
      }
    }
  };
  ear(-3);
  ear(3);

  // Stubby limbs (spheres) for arms and feet.
  const blob = (cx: number, cy: number, cz: number, r: number) => {
    for (let x = -3; x <= 3; x++)
      for (let y = -3; y <= 3; y++)
        for (let z = -3; z <= 3; z++)
          if (x * x + y * y + z * z <= r * r) add(cx + x, cy + y, cz + z, SUB_BODY);
  };
  blob(-rx, -1, 1.6, 1.7); // left arm
  blob(rx, -1, 1.6, 1.7); // right arm
  blob(-2.3, -ry, 2.2, 1.7); // left foot
  blob(2.3, -ry, 2.2, 1.7); // right foot

  // Paint a face detail onto the front-most voxel of a column.
  const frontZ = (x: number, y: number): number | null => {
    let mz: number | null = null;
    for (const k of map.keys()) {
      const [X, Y, Z] = k.split(",").map(Number);
      if (X === x && Y === y && (mz === null || Z > mz)) mz = Z;
    }
    return mz;
  };
  const paint = (x: number, y: number, c: string) => {
    const z = frontZ(x, y);
    if (z !== null) add(x, y, z, c);
  };

  // Closed, content eyes (gentle peaks) + smug wavy mouth + cheek highlight.
  [[-3, 3], [-2, 4], [-1, 3], [1, 3], [2, 4], [3, 3]].forEach(([x, y]) => paint(x, y, SUB_DARK));
  [[-2, 1], [-1, 0], [0, 1], [1, 0], [2, 1]].forEach(([x, y]) => paint(x, y, SUB_DARK));
  paint(3, 2, SUB_HILITE);

  return [...map.entries()].map(([k, color]) => {
    const [x, y, z] = k.split(",").map(Number);
    return { position: [x, y, z] as [number, number, number], color };
  });
}

export const SUBSTITUTE_VOXELS = buildSubstitute();

// ---------------- MissingNo (flat glitch "backwards L", depth = 1) ----------------
// The three sprite colors. Glitch fill is deterministic (seeded) so it's stable.
const MN_PURPLE = "#9c8aa8";
const MN_BLACK = "#181820";
const MN_PEACH = "#ecc9a2";
const MN_W = 14;
const MN_H = 34;

function mnHash(x: number, y: number): number {
  let h = (x * 73856093) ^ (y * 19349663);
  h = (h ^ (h >>> 13)) >>> 0;
  return (h % 1000) / 1000;
}

// Silhouette: full-height right band + lower-left block, with an empty
// upper-left notch (left columns are blank above the notch line).
function mnSolid(x: number, y: number): boolean {
  if (y < 1) return x === 2; // tiny top-left speck (the notch detail)
  if (mnHash(x + 31, y + 7) < 0.06) return false; // sprinkle glitch holes
  if (x >= 7) return true; // right band, full height
  return y >= 13 && x >= 1; // lower-left block (notch is the empty area above)
}

function mnColor(x: number, y: number): string {
  const r = mnHash(x, y);
  const rowType = (y * 2654435 + 7) % 5;
  if (rowType === 0 && r < 0.5) return MN_PEACH; // peach streak rows
  if (rowType === 1 && r < 0.4) return MN_BLACK; // black streak rows
  if (r < 0.12) return MN_BLACK;
  if (r < 0.22) return MN_PEACH;
  return MN_PURPLE;
}

function buildMissingno(): Voxel[] {
  const out: Voxel[] = [];
  for (let y = 0; y < MN_H; y++) {
    for (let x = 0; x < MN_W; x++) {
      if (!mnSolid(x, y)) continue;
      out.push({
        position: [x - (MN_W - 1) / 2, MN_H - 1 - y - (MN_H - 1) / 2, 0],
        color: mnColor(x, y),
      });
    }
  }
  return out;
}

export const MISSINGNO_VOXELS = buildMissingno();
