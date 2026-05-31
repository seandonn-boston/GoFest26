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

// ---------------- MissingNo (flat block transcription, depth = 1) ----------------
// Blocks of color read from the MissingNo sprite: P purple, K black/dark,
// T peach/tan, "." empty. Laid out top→bottom to match the source image —
// full-height right band, empty upper-left notch, peach band near the top,
// black streaks, ragged bottom.
const MN_PALETTE: Record<string, string> = {
  P: "#9b8cb1",
  K: "#20212c",
  T: "#e9c9a1",
};

const MISSINGNO_ROWS = [
  "................",
  ".....K..........",
  "...........PP...",
  "..........PPPPP.",
  ".........PPPPPP.",
  ".........PTTTTPP",
  "........TTTTKTPP",
  "........KTTTTTPP",
  ".........PPPPPPP",
  ".........PPKKPPP",
  ".........KKKPPPP",
  "........PPPPPTPP",
  ".......PPPPPPPPP",
  ".....PPPPPKKPPPP",
  "....PPPPPPPPPPPP",
  "...PPPTTTPPPPKPP",
  "...PPKTTKPPPPPPP",
  "...PPPKKPPPKKPPP",
  "..PPPPPPPPPPPPPP",
  "..PPKPPPPTTPPPPP",
  ".PPPPPKKPPPPPPKP",
  ".PPPPPPPPPPPPPPP",
  ".PPKPPPTPPPPPPPP",
  ".PPPPPPTPPPKKPPP",
  "..PPPKKPPPPPPPPP",
  ".PPPPPPPPPTTPPPP",
  ".PPKPPPPPPPPPPKP",
  ".PPPPPKPPPPPPPPP",
  "..PPPPPPPPPKPPPP",
  ".PKKPPPPPPPPPPPP",
  ".PPPPPPPTTPPPKPP",
  "..PPKPPPPPPPPPPP",
  ".PPPPPPKKPPPPPPP",
  ".PP.PPPPPPPP.PPP",
  "..PPP.PPP.PPPPKP",
  ".P..PP..PP..PPPP",
  "...P...P....PP..",
];

function buildMissingno(): Voxel[] {
  const height = MISSINGNO_ROWS.length;
  const width = Math.max(...MISSINGNO_ROWS.map((r) => r.length));
  const out: Voxel[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = MN_PALETTE[MISSINGNO_ROWS[y][x] ?? "."];
      if (!color) continue;
      out.push({
        position: [x - (width - 1) / 2, height - 1 - y - (height - 1) / 2, 0],
        color,
      });
    }
  }
  return out;
}

export const MISSINGNO_VOXELS = buildMissingno();
