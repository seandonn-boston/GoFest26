"use client";

/*
 * Voxel Substitute loading screen.
 *
 * A procedurally-sculpted voxel Substitute (validated against official art /
 * plush / clay references) hovers over a battle platform at 30° left / 10°
 * down. A Gen-5 databox HP bar depletes green → yellow → red inversely to
 * load progress. At 0 HP the doll is knocked down, bounces with randomized
 * physics, and fades to reveal the planner beneath.
 *
 * Everything (doll, font, UI chrome) is generated at runtime — zero assets.
 * Kept as .jsx: the sculpt (PART/MATID/PALETTE/FACE_SHADE/hash3/
 * buildSubstituteGeometry) is approved and frozen byte-for-byte; its
 * integrity is provable against the offline sculpt-proof renderer.
 */

import { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";

/* ================================================================== */
/* 1) BITMAP PIXEL FONT — 5x7 with 9-row descenders                    */
/* ================================================================== */

const GLY = (s) => s.split("|").map((r) => parseInt(r, 2));

const PIXFONT = {
  A: GLY("01110|10001|10001|11111|10001|10001|10001"),
  B: GLY("11110|10001|10001|11110|10001|10001|11110"),
  C: GLY("01110|10001|10000|10000|10000|10001|01110"),
  D: GLY("11100|10010|10001|10001|10001|10010|11100"),
  E: GLY("11111|10000|10000|11110|10000|10000|11111"),
  F: GLY("11111|10000|10000|11110|10000|10000|10000"),
  G: GLY("01110|10001|10000|10111|10001|10001|01111"),
  H: GLY("10001|10001|10001|11111|10001|10001|10001"),
  I: GLY("01110|00100|00100|00100|00100|00100|01110"),
  J: GLY("00111|00010|00010|00010|00010|10010|01100"),
  K: GLY("10001|10010|10100|11000|10100|10010|10001"),
  L: GLY("10000|10000|10000|10000|10000|10000|11111"),
  M: GLY("10001|11011|10101|10101|10001|10001|10001"),
  N: GLY("10001|11001|10101|10011|10001|10001|10001"),
  O: GLY("01110|10001|10001|10001|10001|10001|01110"),
  P: GLY("11110|10001|10001|11110|10000|10000|10000"),
  Q: GLY("01110|10001|10001|10001|10101|10010|01101"),
  R: GLY("11110|10001|10001|11110|10100|10010|10001"),
  S: GLY("01111|10000|10000|01110|00001|00001|11110"),
  T: GLY("11111|00100|00100|00100|00100|00100|00100"),
  U: GLY("10001|10001|10001|10001|10001|10001|01110"),
  V: GLY("10001|10001|10001|10001|10001|01010|00100"),
  W: GLY("10001|10001|10001|10101|10101|11011|10001"),
  X: GLY("10001|10001|01010|00100|01010|10001|10001"),
  Y: GLY("10001|10001|01010|00100|00100|00100|00100"),
  Z: GLY("11111|00001|00010|00100|01000|10000|11111"),
  a: GLY("00000|00000|01110|00001|01111|10001|01111"),
  b: GLY("10000|10000|11110|10001|10001|10001|11110"),
  c: GLY("00000|00000|01110|10001|10000|10001|01110"),
  d: GLY("00001|00001|01111|10001|10001|10001|01111"),
  e: GLY("00000|00000|01110|10001|11111|10000|01110"),
  f: GLY("00110|01001|01000|11100|01000|01000|01000"),
  g: GLY("00000|00000|01111|10001|10001|01111|00001|00001|01110"),
  h: GLY("10000|10000|11110|10001|10001|10001|10001"),
  i: GLY("00100|00000|01100|00100|00100|00100|01110"),
  j: GLY("00010|00000|00110|00010|00010|00010|00010|10010|01100"),
  k: GLY("10000|10000|10010|10100|11000|10100|10010"),
  l: GLY("01100|00100|00100|00100|00100|00100|01110"),
  m: GLY("00000|00000|11010|10101|10101|10101|10101"),
  n: GLY("00000|00000|11110|10001|10001|10001|10001"),
  o: GLY("00000|00000|01110|10001|10001|10001|01110"),
  p: GLY("00000|00000|11110|10001|10001|11110|10000|10000|10000"),
  q: GLY("00000|00000|01111|10001|10001|01111|00001|00001|00001"),
  r: GLY("00000|00000|10110|11001|10000|10000|10000"),
  s: GLY("00000|00000|01111|10000|01110|00001|11110"),
  t: GLY("01000|01000|11100|01000|01000|01001|00110"),
  u: GLY("00000|00000|10001|10001|10001|10011|01101"),
  v: GLY("00000|00000|10001|10001|10001|01010|00100"),
  w: GLY("00000|00000|10001|10001|10101|10101|01010"),
  x: GLY("00000|00000|10001|01010|00100|01010|10001"),
  y: GLY("00000|00000|10001|10001|10001|01111|00001|00001|01110"),
  z: GLY("00000|00000|11111|00010|00100|01000|11111"),
  0: GLY("01110|10001|10011|10101|11001|10001|01110"),
  1: GLY("00100|01100|00100|00100|00100|00100|01110"),
  2: GLY("01110|10001|00001|00010|00100|01000|11111"),
  3: GLY("11111|00010|00100|00010|00001|10001|01110"),
  4: GLY("00010|00110|01010|10010|11111|00010|00010"),
  5: GLY("11111|10000|11110|00001|00001|10001|01110"),
  6: GLY("00110|01000|10000|11110|10001|10001|01110"),
  7: GLY("11111|00001|00010|00100|01000|01000|01000"),
  8: GLY("01110|10001|10001|01110|10001|10001|01110"),
  9: GLY("01110|10001|10001|01111|00001|00010|01100"),
  ".": GLY("00000|00000|00000|00000|00000|01100|01100"),
  ",": GLY("00000|00000|00000|00000|00000|01100|00100|01000"),
  "!": GLY("00100|00100|00100|00100|00100|00000|00100"),
  "?": GLY("01110|10001|00001|00110|00100|00000|00100"),
  "/": GLY("00001|00001|00010|00100|01000|10000|10000"),
  ":": GLY("00000|01100|01100|00000|01100|01100|00000"),
  "-": GLY("00000|00000|00000|01110|00000|00000|00000"),
  "'": GLY("00100|00100|01000|00000|00000|00000|00000"),
};

function drawPixelText(ctx, text, x, y, px, color) {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of text) {
    if (ch === " ") { cx += 6 * px; continue; }
    const rows = PIXFONT[ch];
    if (!rows) { cx += 6 * px; continue; }
    for (let r = 0; r < rows.length; r++) {
      const bits = rows[r];
      for (let c = 0; c < 5; c++) {
        if ((bits >> (4 - c)) & 1) ctx.fillRect(cx + c * px, y + r * px, px, px);
      }
    }
    cx += 6 * px;
  }
  return cx;
}
const textW = (t, px = 1) => Math.max(0, t.length * 6 * px - px);
function shadowText(ctx, t, x, y, px, color, shadow) {
  drawPixelText(ctx, t, x + px, y + px, px, shadow);
  drawPixelText(ctx, t, x, y, px, color);
}

/* ================================================================== */
/* 2) GEN-5 BATTLE HUD — databoxes + message frame                     */
/* ================================================================== */

const UI = {
  edge: "#0d0f13",
  panel: "#3b4046",
  panelHi: "#50565e",
  panelLo: "#2b2f35",
  capsule: "#15171b",
  hpLabel: "#f8a838",
  lv: "#ffdf86",
  white: "#f8f8f8",
  txtShadow: "#1f2227",
  green: "#55c23f", greenHi: "#a0e878",
  yellow: "#f5bd33", yellowHi: "#fbe27e",
  red: "#ef4f48", redHi: "#fa9078",
};

function pixelPanel(ctx, x, y, w, h, fill, edge) {
  ctx.fillStyle = edge;
  for (let r = 0; r < h; r++) {
    const inset = r === 0 || r === h - 1 ? 3 : r === 1 || r === h - 2 ? 1 : 0;
    ctx.fillRect(x + inset, y + r, w - inset * 2, 1);
  }
  ctx.fillStyle = fill;
  for (let r = 1; r < h - 1; r++) {
    const inset = r === 1 || r === h - 2 ? 3 : r === 2 || r === h - 3 ? 2 : 1;
    ctx.fillRect(x + inset, y + r, w - inset * 2, 1);
  }
}

function hpColors(pct) {
  if (pct > 0.5) return [UI.green, UI.greenHi];
  if (pct > 0.2) return [UI.yellow, UI.yellowHi];
  return [UI.red, UI.redHi];
}

function drawCapsuleBar(ctx, x, y, w, pct, now) {
  ctx.fillStyle = UI.edge;
  ctx.fillRect(x - 1, y - 1, w + 2, 11);
  ctx.fillStyle = UI.capsule;
  ctx.fillRect(x, y, w, 9);
  shadowText(ctx, "HP", x + 3, y + 1, 1, UI.hpLabel, "#5e3c08");
  const bx = x + 17, bw = w - 21, by = y + 2, bh = 5;
  ctx.fillStyle = "#000000";
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  const clamped = Math.max(0, Math.min(1, pct));
  const fw = Math.round(bw * clamped);
  if (fw > 0) {
    const [base, hi] = hpColors(clamped);
    const blink = clamped <= 0.2 && Math.floor(now / 260) % 2 === 0;
    ctx.fillStyle = blink ? UI.redHi : base;
    ctx.fillRect(bx, by, fw, bh);
    ctx.fillStyle = blink ? "#ffffff" : hi;
    ctx.fillRect(bx, by, fw, 2);
  }
}

function drawPlayerBox(ctx, name, lv, cur, max, now) {
  const W = 132, H = 40;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  pixelPanel(ctx, 0, 0, W, H, UI.panel, UI.edge);
  ctx.fillStyle = UI.panelHi; ctx.fillRect(4, 1, W - 8, 1);
  ctx.fillStyle = UI.panelLo; ctx.fillRect(4, H - 2, W - 8, 1);
  shadowText(ctx, name, 7, 5, 1, UI.white, UI.txtShadow);
  const lvT = "Lv." + lv;
  shadowText(ctx, lvT, W - 7 - textW(lvT), 5, 1, UI.lv, UI.txtShadow);
  drawCapsuleBar(ctx, 7, 17, W - 14, cur / max, now);
  const numT = cur + "/" + max;
  shadowText(ctx, numT, W - 7 - textW(numT), 29, 1, UI.white, UI.txtShadow);
}

function wrapWords(text, maxChars) {
  const out = [];
  let line = "";
  for (const w of text.split(" ")) {
    const next = line ? line + " " + w : w;
    if (next.length > maxChars && line) { out.push(line); line = w; }
    else line = next;
  }
  if (line) out.push(line);
  return out.slice(0, 2);
}

function drawMessageBox(ctx, text, typedChars, now) {
  const W = 260, H = 46;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  pixelPanel(ctx, 0, 0, W, H, "#2e333a", UI.edge);
  ctx.fillStyle = "#5a626d";
  ctx.fillRect(4, 2, W - 8, 1); ctx.fillRect(4, H - 3, W - 8, 1);
  ctx.fillRect(2, 4, 1, H - 8); ctx.fillRect(W - 3, 4, 1, H - 8);
  const shown = text.slice(0, typedChars);
  const lines = wrapWords(shown, 39);
  lines.forEach((ln, i) => shadowText(ctx, ln, 10, 9 + i * 15, 1, UI.white, UI.txtShadow));
  if (typedChars >= text.length && Math.floor(now / 450) % 2 === 0) {
    ctx.fillStyle = "#e2453f";
    const ax = W - 16, ay = H - 13;
    ctx.fillRect(ax, ay, 7, 2);
    ctx.fillRect(ax + 1, ay + 2, 5, 2);
    ctx.fillRect(ax + 2, ay + 4, 3, 1);
    ctx.fillRect(ax + 3, ay + 5, 1, 1);
  }
}

/* ================================================================== */
/* 3) THE VOXEL SUBSTITUTE — sculpted from primitives, surface-painted */
/*    face, dashed stitch seams, meshed with hidden-face culling,      */
/*    baked directional light + crevice AO + cloth grain.              */
/*    (Geometry validated offline against official art / plush refs.)  */
/* ================================================================== */

const PART = { HEAD: 1, BODY: 2, EAR: 3, ARM: 4, FOOT: 5, TAIL: 6, SPIKE: 7 };
const MATID = { GREEN: 1, WHITE: 2, LINE: 3, SEAM: 4, SEAMW: 5 };
const PALETTE = {
  [MATID.GREEN]: [0.625, 0.745, 0.505],
  [MATID.WHITE]: [0.965, 0.95, 0.895],
  [MATID.LINE]: [0.14, 0.155, 0.12],
  [MATID.SEAM]: [0.47, 0.575, 0.365],
  [MATID.SEAMW]: [0.8, 0.79, 0.67],
};
const FACE_SHADE = { px: 0.85, nx: 0.8, py: 1.0, ny: 0.58, pz: 0.93, nz: 0.72 };
const hash3 = (x, y, z) => {
  const f = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return f - Math.floor(f) - 0.5;
};

function buildSubstituteGeometry() {
  const NX = 59, NY = 50, NZ = 54;
  const N = NX * NY * NZ;
  const mat = new Uint8Array(N);
  const part = new Uint8Array(N);
  const id = (x, y, z) => x + NX * (y + NY * z);
  const inG = (x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < NX && y < NY && z < NZ;

  const CX = 29.5, CZ = 30; // geometric center: on a column center now
  const CC = 29;             // the true center column (odd-width grid)
  const ellN = (p, c, r) => {
    const dx = (p[0] - c[0]) / r[0], dy = (p[1] - c[1]) / r[1], dz = (p[2] - c[2]) / r[2];
    return dx * dx + dy * dy + dz * dz;
  };
  const inEll = (p, c, r) => ellN(p, c, r) <= 1;
  const inCone = (p, b, d, len, r0, hMax, sx, round) => {
    const vx = p[0] - b[0], vy = p[1] - b[1], vz = p[2] - b[2];
    const h = vx * d[0] + vy * d[1] + vz * d[2];
    if (h < -0.6 || h > (hMax === undefined ? len : hMax)) return false;
    const px = (vx - d[0] * h) / (sx === undefined ? 1 : sx), py = vy - d[1] * h, pz = vz - d[2] * h;
    const u = Math.max(h, 0) / len;
    const rr = r0 * (round ? Math.sqrt(Math.max(0, 1 - u * u)) : 1 - u) + 0.3;
    return px * px + py * py + pz * pz <= rr * rr;
  };
  const nrm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };

  // HEAD — one continuous lofted skull: cranium dome flowing into the snout.
  // Elliptical cross-sections (rx, ry) centered (CX, yc) sweep along z; the
  // bridge tapers convexly to a nose-level tip while the jaw stays flat beneath.
  const inHead = (p) => {
    const zb = CZ - 11, zm = CZ + 3, zf = CZ + 19.5;
    const z = p[2];
    if (z < zb || z > zf) return false;
    let rx, ry, yc;
    if (z <= zm) {
      const t = (z - zb) / (zm - zb);
      const s = t >= 0.7 ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((0.7 - t) / 0.7, 2)));
      rx = 11.5 * (0.35 + 0.65 * s);
      ry = 10.2 * (0.4 + 0.6 * s);
      yc = 31;
    } else {
      const t = (z - zm) / (zf - zm);
      const e = Math.sqrt(Math.max(0, 1 - t * t));
      rx = 11.5 * (0.3 + 0.7 * e);
      ry = 10.2 * (0.26 + 0.74 * e);
      yc = 31 - 2.2 * t * t;
    }
    const dx = (p[0] - CX) / rx, dy = (p[1] - yc) / ry;
    return dx * dx + dy * dy <= 1;
  };
  const bodyC = [CX, 14, CZ - 1], bodyR = [12.8, 12.5, 11.5];
  const bellyC = [CX, 11, CZ + 7.5], bellyR = [9, 8.5, 4];
  const hipsC = [CX, 6, CZ - 0.5], hipsR = [14.2, 7, 11.5];
  const earL = { b: [CX - 7.4, 35.7, CZ - 2.4], d: nrm([-0.5, 0.82, -0.28]), len: 10, r: 4.6 };
  const earR = { b: [CX + 7.4, 35.7, CZ - 2.4], d: nrm([0.5, 0.82, -0.28]), len: 10, r: 4.6 };
  const armLB = [CX - 10.8, 20.5, CZ + 5], armRB = [CX + 10.8, 20.5, CZ + 5];
  const armLD = nrm([0.096, -0.27, 0.958]), armRD = nrm([-0.096, -0.27, 0.958]);
  const tail = { b: [CX, 7.5, CZ - 9.5], d: nrm([0, -0.28, -0.96]), len: 18, r: 6.2 };
  const spike1 = { b: [CX, 27.5, CZ - 9.5], d: nrm([0, 0.35, -0.94]), len: 9.5, r: 3.8 };
  const spike2 = { b: [CX, 18, CZ - 10.5], d: nrm([0, 0.22, -0.975]), len: 10, r: 4 };

  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    const p = [x + 0.5, y + 0.5, z + 0.5];
    let pt = 0;
    if (inHead(p)) pt = PART.HEAD;
    else if (inEll(p, bodyC, bodyR) || inEll(p, bellyC, bellyR) || inEll(p, hipsC, hipsR)) pt = PART.BODY;
    else if (inCone(p, earL.b, earL.d, earL.len, earL.r, 8.5) || inCone(p, earR.b, earR.d, earR.len, earR.r, 8.5)) pt = PART.EAR;
    else if (
      inCone(p, armLB, armLD, 32, 4.2, 10) || inEll(p, [CX - 10.8, 20.5, CZ + 5], [3.8, 4.2, 4.5]) ||
      inCone(p, armRB, armRD, 32, 4.2, 10) || inEll(p, [CX + 10.8, 20.5, CZ + 5], [3.8, 4.2, 4.5])
    ) pt = PART.ARM;
    else if (inEll(p, [CX - 10, 5.5, CZ + 8.5], [6.2, 5.5, 8]) || inEll(p, [CX + 10, 5.5, CZ + 8.5], [6.2, 5.5, 8])) pt = PART.FOOT;
    else if (inCone(p, tail.b, tail.d, tail.len, tail.r, undefined, 1)) pt = PART.TAIL;
    else if (inCone(p, spike1.b, spike1.d, spike1.len, spike1.r, undefined, 0.6) || inCone(p, spike2.b, spike2.d, spike2.len, spike2.r, undefined, 0.6)) pt = PART.SPIKE;
    if (!pt) continue;

    let m = MATID.GREEN;
    if (pt === PART.BODY && ellN(p, bellyC, bellyR) <= 1) m = MATID.WHITE;
    const i = id(x, y, z);
    mat[i] = m; part[i] = pt;
  }

  // belly stitching: dashed seam exactly where the white patch meets green fabric
  const NBR = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    const i = id(x, y, z);
    if (mat[i] !== MATID.WHITE || part[i] !== PART.BODY) continue;
    let onEdge = false;
    for (const o of NBR) {
      const nx2 = x + o[0], ny2 = y + o[1], nz2 = z + o[2];
      if (inG(nx2, ny2, nz2) && mat[id(nx2, ny2, nz2)] === MATID.GREEN) { onEdge = true; break; }
    }
    if (!onEdge) continue;
    const a = Math.atan2(Math.abs(x + 0.5 - CX), y - bellyC[1]);
    if (Math.floor(a / 0.5) % 2 === 0) mat[i] = MATID.SEAM;
  }

  const paintFront = (x, y, m, depth) => {
    const dmax = depth === undefined ? 3 : depth;
    for (let z = NZ - 1; z >= 0; z--) {
      const i = id(x, y, z);
      if (mat[i] && part[i] === PART.HEAD) {
        for (let k = 0; k < dmax && z - k >= 0; k++) {
          const j = id(x, y, z - k);
          if (mat[j] && part[j] === PART.HEAD) mat[j] = m;
        }
        return;
      }
    }
  };
  const paintTop = (x, z, m) => {
    for (let y = NY - 1; y >= 0; y--) {
      const i = id(x, y, z);
      if (mat[i] && part[i] === PART.HEAD) {
        for (let k = 0; k < 3 && y - k >= 0; k++) {
          const j = id(x, y - k, z);
          if (mat[j] && part[j] === PART.HEAD) mat[j] = m;
        }
        return;
      }
    }
  };

  // mouth: long thin wavy stitch, ends curling up into the cheek patches
  // center seam: continuous stitch from the forehead down the face, chin,
  // chest, and across the belly patch (face features paint over it)
  const paintFrontAny = (x, y, m) => {
    for (let z = NZ - 1; z >= 0; z--) {
      const i = id(x, y, z);
      if (mat[i]) {
        for (let k = 0; k < 3 && z - k >= 0; k++) {
          const j = id(x, y, z - k);
          if (mat[j]) mat[j] = mat[j] === MATID.WHITE || mat[j] === MATID.SEAMW ? MATID.SEAMW : m;
        }
        return;
      }
    }
  };
  for (let y = 2; y <= 40; y++) paintFrontAny(CC, y, MATID.SEAM);

  // FACE — crafted in the side plane (z, y) and mirrored symmetrically.
  // Each mark paints the laterally-outermost head surface on BOTH sides, so
  // shapes are true in profile (a circle is a circle from the side view).
  const paintSide = (z, y, m, depth) => {
    const dmax = depth === undefined ? 3 : depth;
    for (let x = NX - 1; x >= 0; x--) {
      const i = id(x, y, z);
      if (mat[i] && part[i] === PART.HEAD) {
        for (let k = 0; k < dmax && x - k >= 0; k++) {
          const j = id(x - k, y, z);
          if (mat[j] && part[j] === PART.HEAD) mat[j] = m;
        }
        break;
      }
    }
    for (let x = 0; x < NX; x++) {
      const i = id(x, y, z);
      if (mat[i] && part[i] === PART.HEAD) {
        for (let k = 0; k < dmax && x + k < NX; k++) {
          const j = id(x + k, y, z);
          if (mat[j] && part[j] === PART.HEAD) mat[j] = m;
        }
        break;
      }
    }
  };
  // cheek: a five-block circle in profile, set back and below the eye
  for (let z = 31; z <= 37; z++) for (let y = 25; y <= 31; y++) {
    const dzc = (z - 34) / 2.5, dyc = (y - 28) / 2.5;
    if (dzc * dzc + dyc * dyc <= 1) paintSide(z, y, MATID.WHITE, 2);
  }
  // mouth: from the snout tip back along the jowl, curling up into the hook
  const MOUTH = [[49, 28], [48, 27], [47, 27], [46, 26], [45, 26], [44, 25], [43, 25], [42, 25], [41, 26], [40, 26], [39, 27]];
  for (const [z, y] of MOUTH) paintSide(z, y, MATID.LINE, 3);
  // eye: one third (120°) of a radius-4 circle — rising from the back,
  // over the crown of the arc, descending lower toward the snout
  const EYE = [[34, 33], [35, 33], [36, 34], [37, 34], [38, 34], [38, 35], [39, 35], [40, 35], [41, 34], [42, 33], [43, 32]];
  for (const [z, y] of EYE) paintSide(z, y, MATID.LINE, 2);
  // crown + forehead seams, dashed
  for (let z = CZ - 11; z <= CZ + 19; z++) paintTop(CC, z, MATID.SEAM);
  const paintBack = (x, y, m) => {
    for (let z = 0; z < NZ; z++) {
      const i = id(x, y, z);
      if (mat[i]) {
        for (let k = 0; k < 3 && z + k < NZ; k++) {
          const j = id(x, y, z + k);
          if (mat[j]) mat[j] = m;
        }
        return;
      }
    }
  };
  for (let y = 2; y <= 40; y++) paintBack(CC, y, MATID.SEAM);
  // underside: the seam continues beneath the doll and along the tail's belly,
  // closing the full meridian loop
  const paintBottom = (x, z, m) => {
    for (let y = 0; y < NY; y++) {
      const i = id(x, y, z);
      if (mat[i]) {
        for (let k = 0; k < 3 && y + k < NY; k++) {
          const j = id(x, y + k, z);
          if (mat[j]) mat[j] = mat[j] === MATID.WHITE || mat[j] === MATID.SEAMW ? MATID.SEAMW : m;
        }
        return;
      }
    }
  };
  for (let z = 2; z <= CZ + 17; z++) paintBottom(CC, z, MATID.SEAM);

  /* meshing */
  const DIRS = [
    { k: "px", o: [1, 0, 0], q: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
    { k: "nx", o: [-1, 0, 0], q: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
    { k: "py", o: [0, 1, 0], q: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
    { k: "ny", o: [0, -1, 0], q: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    { k: "pz", o: [0, 0, 1], q: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    { k: "nz", o: [0, 0, -1], q: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
  ];
  const solidAt = (x, y, z) => inG(x, y, z) && mat[id(x, y, z)] !== 0;

  const pos = [], col = [], idxArr = [];
  let vCount = 0;
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, minZ = 1e9, maxZ = -1e9;

  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    const i = id(x, y, z);
    if (!mat[i]) continue;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x + 1);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y + 1);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z + 1);
    const base = PALETTE[mat[i]];
    const grain = 1 + hash3(x, y, z) * 0.07;
    for (const d of DIRS) {
      const ex = x + d.o[0], ey = y + d.o[1], ez = z + d.o[2];
      if (solidAt(ex, ey, ez)) continue;
      let occ = 0;
      for (const dd of DIRS) {
        if (dd === d) continue;
        if (dd.o[0] === -d.o[0] && dd.o[1] === -d.o[1] && dd.o[2] === -d.o[2]) continue;
        if (solidAt(ex + dd.o[0], ey + dd.o[1], ez + dd.o[2])) occ++;
      }
      const shade = FACE_SHADE[d.k] * grain * (1 - 0.065 * occ);
      const r = Math.min(1, base[0] * shade), g = Math.min(1, base[1] * shade), b = Math.min(1, base[2] * shade);
      for (const v of d.q) { pos.push(x + v[0], y + v[1], z + v[2]); col.push(r, g, b); }
      idxArr.push(vCount, vCount + 1, vCount + 2, vCount, vCount + 2, vCount + 3);
      vCount += 4;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idxArr);
  const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2, midZ = (minZ + maxZ) / 2;
  geo.translate(-midX, -midY, -midZ);
  return { geo, halfH: (maxY - minY) / 2, halfD: (maxZ - minZ) / 2 };
}

/* ================================================================== */
/* 4) THE LOADING SCREEN                                               */
/*    Hover = "still loading". HP depletes inversely to progress.      */
/*    0 HP -> knocked down -> randomized bounces -> fade -> reveal.    */
/* ================================================================== */

const MAX_HP = 100;
// Real Pokémon GO charged attacks (no fast moves) — includes legendary /
// Community Day exclusives. One is picked at random for each load.
const CHARGED_MOVES = [
  // Normal
  "BODY SLAM", "BOOMBURST", "FRUSTRATION", "GIGA IMPACT", "HORN ATTACK",
  "HYPER BEAM", "HYPER FANG", "LAST RESORT", "RETURN", "SKULL BASH", "STOMP",
  "STRUGGLE", "SWIFT", "TECHNO BLAST", "TRI ATTACK", "VISE GRIP", "WEATHER BALL", "WRAP",
  // Fighting
  "AURA SPHERE", "BRICK BREAK", "CLOSE COMBAT", "CROSS CHOP", "DYNAMIC PUNCH",
  "FLYING PRESS", "FOCUS BLAST", "LOW SWEEP", "POWER-UP PUNCH", "SACRED SWORD",
  "SUBMISSION", "SUPERPOWER",
  // Flying
  "ACROBATICS", "AERIAL ACE", "AEROBLAST", "AIR CUTTER", "BRAVE BIRD",
  "DRAGON ASCENT", "DRILL PECK", "FEATHER DANCE", "FLY", "HURRICANE",
  "OBLIVION WING", "SKY ATTACK",
  // Poison
  "ACID SPRAY", "CROSS POISON", "GUNK SHOT", "POISON FANG", "SLUDGE",
  "SLUDGE BOMB", "SLUDGE WAVE",
  // Ground
  "BONE CLUB", "BULLDOZE", "DIG", "DRILL RUN", "EARTH POWER", "EARTHQUAKE",
  "HIGH HORSEPOWER", "MUD BOMB", "PRECIPICE BLADES", "SAND TOMB", "SCORCHING SANDS",
  // Rock
  "ANCIENT POWER", "METEOR BEAM", "POWER GEM", "ROCK BLAST", "ROCK SLIDE",
  "ROCK TOMB", "ROCK WRECKER", "STONE EDGE",
  // Bug
  "BUG BUZZ", "FELL STINGER", "MEGAHORN", "SIGNAL BEAM", "SILVER WIND", "X-SCISSOR",
  // Ghost
  "NIGHT SHADE", "OMINOUS WIND", "SHADOW BALL", "SHADOW BONE", "SHADOW FORCE",
  "SHADOW PUNCH", "SHADOW SNEAK",
  // Steel
  "DOOM DESIRE", "DOUBLE IRON BASH", "FLASH CANNON", "HEAVY SLAM", "IRON HEAD",
  "MAGNET BOMB", "METEOR MASH", "MIRROR SHOT",
  // Fire
  "BLAST BURN", "BLAZE KICK", "FIRE BLAST", "FIRE PUNCH", "FLAME BURST",
  "FLAME CHARGE", "FLAME WHEEL", "FLAMETHROWER", "FUSION FLARE", "HEAT WAVE",
  "MAGMA STORM", "MYSTICAL FIRE", "OVERHEAT", "SACRED FIRE", "V-CREATE",
  // Water
  "AQUA JET", "AQUA TAIL", "BRINE", "BUBBLE BEAM", "CRABHAMMER", "HYDRO CANNON",
  "HYDRO PUMP", "LIQUIDATION", "MUDDY WATER", "OCTAZOOKA", "ORIGIN PULSE",
  "SCALD", "SURF", "WATER PULSE",
  // Grass
  "ENERGY BALL", "FRENZY PLANT", "GRASS KNOT", "LEAF BLADE", "LEAF STORM",
  "LEAF TORNADO", "PETAL BLIZZARD", "POWER WHIP", "SEED BOMB", "SEED FLARE",
  "SOLAR BEAM", "TRAILBLAZE",
  // Electric
  "AURA WHEEL", "DISCHARGE", "FUSION BOLT", "PARABOLIC CHARGE", "THUNDER",
  "THUNDER PUNCH", "THUNDERBOLT", "WILD CHARGE", "ZAP CANNON",
  // Psychic
  "FUTURE SIGHT", "LUSTER PURGE", "MIRROR COAT", "MIST BALL", "PSYBEAM",
  "PSYCHIC", "PSYCHIC FANGS", "PSYCHO BOOST", "PSYSHOCK", "PSYSTRIKE", "SYNCHRONOISE",
  // Ice
  "AURORA BEAM", "AVALANCHE", "BLIZZARD", "GLACIATE", "ICE BEAM", "ICE PUNCH",
  "ICICLE SPEAR", "ICY WIND", "TRIPLE AXEL",
  // Dragon
  "BREAKING SWIPE", "DRACO METEOR", "DRAGON CLAW", "DRAGON PULSE", "OUTRAGE",
  "ROAR OF TIME", "SPACIAL REND", "TWISTER",
  // Dark
  "BRUTAL SWING", "CRUNCH", "DARK PULSE", "FOUL PLAY", "NIGHT SLASH",
  "OBSTRUCT", "PAYBACK",
  // Fairy
  "DAZZLING GLEAM", "DISARMING VOICE", "DRAINING KISS", "MOONBLAST", "PLAY ROUGH",
];
const loadMsgs = (move) => [
  { at: 0, t: "Website used SUBSTITUTE!" },
  { at: 25, t: "You used " + move + "!" },
  { at: 55, t: "A critical hit!" },
  { at: 78, t: "It's super effective!" },
];
const FAINT_MSG = "SUBSTITUTE fainted!";

function SubstituteLoader({ onDone }) {
  const glRef = useRef(null);
  const playerRef = useRef(null);
  const msgRef = useRef(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const simRef = useRef(null);

  const motes = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      left: 6 + ((i * 53) % 90),
      size: 2 + (i % 3) * 2,
      dur: 9 + (i % 5) * 2.6,
      delay: -(i * 1.7),
      op: 0.1 + (i % 4) * 0.05,
    })),
    []
  );

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const LOAD_MSGS = loadMsgs(CHARGED_MOVES[Math.floor(Math.random() * CHARGED_MOVES.length)]);

    // The sculpt was approved under three r128's raw color pipeline; modern
    // three (r152+) defaults to sRGB color management, which would wash out
    // the baked vertex colors relative to the reference renders. Restore the
    // r128 behavior: raw colors in, no output transform.
    THREE.ColorManagement.enabled = false;

    const IR = 320;
    const renderer = new THREE.WebGLRenderer({ canvas: glRef.current, antialias: false, alpha: true });
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.setPixelRatio(1);
    renderer.setSize(IR, IR, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const V = 38;
    const camera = new THREE.OrthographicCamera(-V, V, V, -V, 0.1, 500);
    camera.position.set(0, 56, 130);
    camera.lookAt(0, 21, 0);

    const { geo, halfH, halfD } = buildSubstituteGeometry();
    const dollMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide });
    const doll = new THREE.Mesh(geo, dollMat);
    const group = new THREE.Group();
    group.add(doll);
    scene.add(group);

    const platMatA = new THREE.MeshBasicMaterial({ color: 0x6fa763, transparent: true, opacity: 0.95 });
    const platMatB = new THREE.MeshBasicMaterial({ color: 0x507f49, transparent: true, opacity: 0.95 });
    const plat = new THREE.Mesh(new THREE.CircleGeometry(21, 40), platMatA);
    plat.rotation.x = -Math.PI / 2; plat.scale.set(1.18, 0.62, 1); plat.position.y = 0.05;
    const rim = new THREE.Mesh(new THREE.RingGeometry(21, 24, 40), platMatB);
    rim.rotation.x = -Math.PI / 2; rim.scale.set(1.18, 0.62, 1); rim.position.y = 0.04;
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x10210f, transparent: true, opacity: 0.34 });
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(15, 32), shadowMat);
    shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1.1, 0.6, 1); shadow.position.y = 0.12;
    scene.add(plat, rim, shadow);

    const BASE_RX = THREE.MathUtils.degToRad(10);  // 10 degrees down
    const BASE_RY = THREE.MathUtils.degToRad(-30); // 30 degrees to the left
    const sim = {
      phase: "load", progress: 0, t: 0,
      stalls: [{ at: 33, dur: 0.7, hit: false }, { at: 71, dur: 0.55, hit: false }],
      stallLeft: 0,
      msgText: "", msgStart: 0,
      px: 0, py: halfH + 2.4, vy: 0, vx: 0,
      rx: BASE_RX, rz: 0, vrx: 0, vrz: 0,
      bounces: 0, grounded: false, settleAt: 0, dieAt: 0, fadeStart: 0, fade: 0,
      doneFired: false,
    };
    simRef.current = sim;

    const fit = () => {
      const W = window.innerWidth, H = window.innerHeight;
      const s3 = Math.round(Math.min(W * 0.84, H * 0.52, 540));
      glRef.current.style.width = s3 + "px";
      glRef.current.style.height = s3 + "px";
      const hud = (cv, lw, lh, target) => {
        if (!cv) return;
        const k = Math.max(1, Math.floor((Math.min(target, lw * 4) / lw) * 2) / 2);
        cv.style.width = lw * k + "px";
        cv.style.height = lh * k + "px";
      };
      hud(playerRef.current, 132, 40, Math.min(W * 0.48, 350));
      hud(msgRef.current, 260, 46, Math.min(W * 0.92, 650));
    };
    fit();
    window.addEventListener("resize", fit);

    const pCtx = playerRef.current.getContext("2d");
    const mCtx = msgRef.current.getContext("2d");

    let raf = 0, last = performance.now(), dead = false;
    const G_ACC = 215;

    const tick = (now) => {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      sim.t += dt;

      if (sim.phase === "load") {
        if (sim.stallLeft > 0) sim.stallLeft -= dt;
        else {
          for (const s of sim.stalls) if (!s.hit && sim.progress >= s.at) { s.hit = true; sim.stallLeft = s.dur; }
          const rate = 15 + Math.sin(sim.t * 1.9) * 5 + Math.sin(sim.t * 0.7) * 3;
          sim.progress = Math.min(100, sim.progress + rate * dt);
        }
        if (sim.progress >= 100) { sim.phase = "dying"; sim.dieAt = now; }
      }
      if (sim.phase === "dying" && now - sim.dieAt > 480) {
        sim.phase = "ko";
        sim.vy = reduce ? 16 : 36 + Math.random() * 10;
        sim.vx = (Math.random() - 0.5) * 7;
        sim.vrx = -(2.1 + Math.random() * 1.3);
        sim.vrz = (Math.random() - 0.5) * 2.6;
      }

      const hoverAmp = reduce ? 0.5 : 1.6;
      if (sim.phase === "load" || sim.phase === "dying") {
        sim.py = halfH + 2.4 + Math.sin(sim.t * 2.6) * hoverAmp;
        sim.rz = Math.sin(sim.t * 1.7) * 0.018;
        sim.rx = BASE_RX;
      } else {
        sim.vy -= G_ACC * dt;
        sim.py += sim.vy * dt;
        sim.px += sim.vx * dt;
        sim.rx += sim.vrx * dt;
        sim.rz += sim.vrz * dt;
        sim.vrz *= 0.985;
        if (sim.rx < -1.62) { sim.rx = -1.62; sim.vrx *= -0.22; }
        const tilt = Math.min(Math.PI / 2, Math.max(0, BASE_RX - sim.rx));
        const rest = halfH - (halfH - halfD - 0.5) * Math.sin(tilt);
        if (sim.py <= rest) {
          sim.py = rest;
          if (Math.abs(sim.vy) > 10 && sim.bounces < 6) {
            sim.vy = -sim.vy * (0.4 + Math.random() * 0.1) + Math.random() * 3;
            sim.vx += (Math.random() - 0.5) * 9;
            sim.vrz += (Math.random() - 0.5) * 2.4;
            sim.vrx += (Math.random() - 0.5) * 0.8;
            sim.bounces++;
          } else {
            sim.vy = 0; sim.vx *= 0.82; sim.vrz *= 0.8;
            if (!sim.grounded) { sim.grounded = true; sim.settleAt = now; }
          }
        }
        if (sim.grounded && sim.phase === "ko" && now - sim.settleAt > 420) {
          sim.phase = "fade"; sim.fadeStart = now;
        }
        if (sim.phase === "fade") {
          sim.fade = Math.min(1, (now - sim.fadeStart) / 900);
          if (sim.fade >= 1 && !sim.doneFired) {
            sim.doneFired = true;
            setTimeout(() => doneRef.current && doneRef.current(), 250);
          }
        }
      }

      group.position.set(sim.px, sim.py, 0);
      group.rotation.set(sim.rx, BASE_RY, sim.rz);
      dollMat.opacity = 1 - sim.fade;

      const hover = Math.max(0, sim.py - halfH);
      const hn = Math.min(1, hover / 5);
      shadow.position.x = sim.px * 0.9;
      const tiltNow = Math.max(0, BASE_RX - sim.rx);
      const sScale = (1.18 - hn * 0.16) * (1 + tiltNow * 0.18);
      shadow.scale.set(sScale * 1.1, sScale * 0.6, 1);
      shadowMat.opacity = (0.34 - hn * 0.13) * (1 - sim.fade);

      const cur = Math.max(0, Math.ceil(MAX_HP * (1 - sim.progress / 100)));
      drawPlayerBox(pCtx, "LOADING", 67, cur, MAX_HP, now);

      const target =
        sim.phase === "load"
          ? LOAD_MSGS.reduce((acc, m) => (sim.progress >= m.at ? m.t : acc), LOAD_MSGS[0].t)
          : FAINT_MSG;
      if (target !== sim.msgText) { sim.msgText = target; sim.msgStart = now; }
      const typed = Math.floor((now - sim.msgStart) / 26);
      drawMessageBox(mCtx, sim.msgText, typed, now);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
      geo.dispose(); dollMat.dispose();
      plat.geometry.dispose(); rim.geometry.dispose(); shadow.geometry.dispose();
      platMatA.dispose(); platMatB.dispose(); shadowMat.dispose();
      renderer.dispose();
    };
  }, []);

  const pixel = { imageRendering: "pixelated" };

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden select-none"
      style={{ background: "linear-gradient(180deg,#1b2438 0%,#141b29 45%,#0d1117 100%)" }}
    >
      <style>{`
        @keyframes moteRise {
          0% { transform: translateY(8vh); opacity: 0; }
          18% { opacity: var(--mo); }
          82% { opacity: var(--mo); }
          100% { transform: translateY(-92vh); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) { .sub-mote { display: none; } }
      `}</style>

      {motes.map((m, i) => (
        <span
          key={i}
          className="sub-mote absolute bottom-0"
          style={{
            left: m.left + "%",
            width: m.size,
            height: m.size,
            background: "#9EBD80",
            "--mo": m.op,
            animation: "moteRise " + m.dur + "s linear " + m.delay + "s infinite",
          }}
        />
      ))}

      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{ width: "72vmin", height: "72vmin", background: "radial-gradient(circle,rgba(158,189,128,0.16),transparent 62%)" }}
      />

      <div className="flex-1 flex items-center justify-center min-h-0 pt-4 sm:pt-7">
        <canvas ref={glRef} width={320} height={320} style={pixel} />
      </div>

      <div className="px-4 sm:px-8 flex justify-end">
        <canvas ref={playerRef} width={132} height={40} style={pixel} />
      </div>

      <div className="flex justify-center px-3 pt-2 pb-4 sm:pb-6">
        <canvas ref={msgRef} width={260} height={46} style={pixel} />
      </div>
    </div>
  );
}

export default SubstituteLoader;
