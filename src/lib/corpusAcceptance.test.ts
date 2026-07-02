/**
 * Ground-truth acceptance suite for the screenshot scanner, run against REAL
 * OCR output of the user-verified corpus.
 *
 * The dumps are produced by the offline lab (browser-equivalent: ICC->sRGB
 * conversion, the production preprocessing, and the production Tesseract
 * config) and are not committed; when the dump file is absent — e.g. in CI —
 * the suite skips. To regenerate: see /tmp/ocrlab (acceptance.py + dumpacc.js)
 * or rebuild from the corpus screenshots.
 *
 * Every entry's values were confirmed by eye against the screenshot pixels.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { assembleScan, mergeParsed, numVal, parsePage, reconcileFusedValues, type ScanResult } from "./screenshotScan";

const DUMPS = process.env.OCR_LAB_DUMPS ?? "/tmp/ocrlab/acceptance-pages.json";

interface Truth {
  stardust?: number;
  candy: number;
  xlCandy: number;
  /** [value, species, form?] per energy, in on-screen order. */
  energies: [number, string, ("x" | "y")?][];
}

// User-verified control values (Dragonite's candy is 1,427 per the pixels).
const TRUTH: Record<string, Truth> = {
  mewtwo: {
    stardust: 999113,
    candy: 26,
    xlCandy: 27,
    energies: [
      [0, "mewtwo", "x"],
      [0, "mewtwo", "y"],
    ],
  },
  groudon: { stardust: 1001623, candy: 181, xlCandy: 82, energies: [[485, "groudon"]] },
  necrozma: { stardust: 1001623, candy: 100, xlCandy: 44, energies: [] }, // fused Dusk Mane: no energy cells
  rayquaza: { stardust: 1001623, candy: 67, xlCandy: 12, energies: [[9475, "rayquaza"]] },
  dragonite: { stardust: 1001623, candy: 1427, xlCandy: 25, energies: [[3985, "dragonite"]] },
  metagross: { stardust: 1001623, candy: 1993, xlCandy: 291, energies: [[6212, "metagross"]] },
  darkrai: { stardust: 1001623, candy: 364, xlCandy: 78, energies: [] },
  hydreigon: { stardust: 1001623, candy: 1769, xlCandy: 206, energies: [] },
  genesect: { stardust: 1001623, candy: 170, xlCandy: 205, energies: [] },
  giratina: { stardust: 1001623, candy: 487, xlCandy: 229, energies: [] },
};

/** Mirrors scanScreenshot's merge chain over the dumped passes. */
function scanDump(p: Record<string, { words: { text: string }[]; text: string }>): ScanResult {
  let parsed = parsePage(p["11"] as never);
  if (p["3"]) parsed = mergeParsed(parsed, parsePage(p["3"] as never));
  if (p["raw"]) {
    parsed = mergeParsed(parsed, parsePage(p["raw"] as never));
    reconcileFusedValues(
      parsed,
      p["raw"].words.map((w) => numVal(w.text)).filter((v): v is number => v !== null),
    );
  }
  return assembleScan(parsed, 0);
}

describe.skipIf(!existsSync(DUMPS))("corpus acceptance (user-verified ground truth)", () => {
  const pages = existsSync(DUMPS) ? JSON.parse(readFileSync(DUMPS, "utf8")) : {};
  for (const [key, truth] of Object.entries(TRUTH)) {
    it.skipIf(!pages[key])(key, () => {
      const r = scanDump(pages[key]);
      expect(r.candy, "candy").toBe(truth.candy);
      expect(r.xlCandy, "xlCandy").toBe(truth.xlCandy);
      if (truth.stardust !== undefined) expect(r.stardust, "stardust").toBe(truth.stardust);
      expect(
        r.megaEnergies.map((e) => [e.value, e.species, ...(e.form ? [e.form] : [])]),
        "energies",
      ).toEqual(truth.energies);
    });
  }
});
