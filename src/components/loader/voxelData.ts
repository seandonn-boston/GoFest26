// Voxel models built by extruding pixel-art sprites into 3D cubes.

export interface Voxel {
  position: [number, number, number];
  color: string;
}

interface BuildOpts {
  depth?: number;
  /** Characters whose detail only appears on the front face (back uses backColor). */
  frontOnly?: string;
  backColor?: string;
}

function buildVoxels(rows: string[], palette: Record<string, string>, opts: BuildOpts = {}): Voxel[] {
  const depth = opts.depth ?? 3;
  const frontOnly = new Set((opts.frontOnly ?? "").split(""));
  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length));
  const out: Voxel[] = [];
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      const ch = row[x] ?? " ";
      if (ch === " " || ch === "." || !palette[ch]) continue;
      for (let z = 0; z < depth; z++) {
        const isFront = z === depth - 1;
        const color = !isFront && frontOnly.has(ch) ? opts.backColor ?? palette[ch] : palette[ch];
        out.push({
          position: [x - (width - 1) / 2, height - 1 - y - (height - 1) / 2, z - (depth - 1) / 2],
          color,
        });
      }
    }
  }
  return out;
}

// ---- Substitute doll ----
const SUB_PALETTE: Record<string, string> = {
  D: "#5a4632", // outline
  B: "#c2a077", // body
  F: "#ece0c6", // face
  E: "#23262e", // eyes
  M: "#8a3d2e", // mouth
  H: "#b59a68", // top tuft
};

const SUB_ROWS = [
  "...DDD...",
  "..DHHHD..",
  ".DFFFFFD.",
  ".DFEFEFD.",
  ".DFFFFFD.",
  ".DFFMFFD.",
  ".DDFFFDD.",
  "..DBBBD..",
  ".DBBBBBD.",
  "DBBBBBBBD",
  ".DD...DD.",
];

export const SUBSTITUTE_VOXELS = buildVoxels(SUB_ROWS, SUB_PALETTE, {
  depth: 3,
  frontOnly: "FEM",
  backColor: SUB_PALETTE.B,
});

// ---- MissingNo (glitch "L") ----
const MISSINGNO_PALETTE: Record<string, string> = {
  g: "#8c8c8c",
  d: "#4f4f4f",
  l: "#c9c9c9",
};

const MISSINGNO_ROWS = [
  ".....gggg",
  ".....gddg",
  ".....gggg",
  ".....glgg",
  ".....gggg",
  "...gggggg",
  "..gddgggg",
  ".ggggdlgg",
  "ggglggggg",
  "gggggggdg",
  "ggdlggggg",
  ".gg.gg.g.",
];

export const MISSINGNO_VOXELS = buildVoxels(MISSINGNO_ROWS, MISSINGNO_PALETTE, { depth: 2 });
