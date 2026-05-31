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
