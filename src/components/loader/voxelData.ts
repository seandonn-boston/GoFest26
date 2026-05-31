// Voxel models. The Substitute is built volumetrically (a chunky plushie with
// real depth); MissingNo is an extruded glitch sprite.

export interface Voxel {
  position: [number, number, number];
  color: string;
}

// ---------------- Substitute plushie (sage green, white belly, eared) ----------------
// Palette matched to the Substitute Doll plush references.
const SUB_BODY = "#9cb877"; // sage green
const SUB_BELLY = "#eef0e2"; // cream belly
const SUB_DARK = "#3c4a2e"; // eyes / mouth
const SUB_HILITE = "#ffffff"; // cheek highlight

function buildSubstitute(): Voxel[] {
  const map = new Map<string, string>();
  const add = (x: number, y: number, z: number, c: string) =>
    map.set(`${Math.round(x)},${Math.round(y)},${Math.round(z)}`, c);

  const rx = 6;
  const ry = 6;
  const rz = 5;

  // Rounded plush body (squashed sphere) + big cream belly on the lower front.
  for (let x = -rx; x <= rx; x++) {
    for (let y = -ry; y <= ry; y++) {
      for (let z = -rz; z <= rz; z++) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) + (z * z) / (rz * rz) <= 1) {
          const belly = z > rz * 0.18 && (x * x) / 13 + ((y + 2.5) * (y + 2.5)) / 14 <= 1 && y <= 0.5;
          add(x, y, z, belly ? SUB_BELLY : SUB_BODY);
        }
      }
    }
  }

  // Two pointed ears that rise and lean outward (cat/dino-style).
  const ear = (sign: number) => {
    for (let i = 0; i < 6; i++) {
      const yy = ry - 1 + i;
      const r = 2.3 - i * 0.4;
      if (r <= 0) continue;
      const cx = sign * 3 + sign * i * 0.4;
      for (let x = -3; x <= 3; x++)
        for (let z = -2; z <= 2; z++)
          if (x * x + z * z <= r * r) add(cx + x, yy, z, SUB_BODY);
    }
  };
  ear(-1);
  ear(1);

  // Stubby limbs (spheres): arms resting in front, feet at the bottom front.
  const blob = (cx: number, cy: number, cz: number, r: number) => {
    for (let x = -3; x <= 3; x++)
      for (let y = -3; y <= 3; y++)
        for (let z = -3; z <= 3; z++)
          if (x * x + y * y + z * z <= r * r) add(cx + x, cy + y, cz + z, SUB_BODY);
  };
  blob(-rx + 0.5, -1.5, rz - 1, 2); // left arm
  blob(rx - 0.5, -1.5, rz - 1, 2); // right arm
  blob(-2.6, -ry, rz - 1.5, 2); // left foot
  blob(2.6, -ry, rz - 1.5, 2); // right foot

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

  // Smug closed eyes (down-tilted dashes) + wavy mouth + cheek highlight.
  [[-3, 4], [-2, 3], [1, 3], [2, 4]].forEach(([x, y]) => paint(x, y, SUB_DARK));
  [[-2, 1], [-1, 2], [0, 1], [1, 2], [2, 1]].forEach(([x, y]) => paint(x, y, SUB_DARK));
  paint(3, 2, SUB_HILITE);
  paint(3, 1, SUB_HILITE);

  return [...map.entries()].map(([k, color]) => {
    const [x, y, z] = k.split(",").map(Number);
    return { position: [x, y, z] as [number, number, number], color };
  });
}

export const SUBSTITUTE_VOXELS = buildSubstitute();

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
