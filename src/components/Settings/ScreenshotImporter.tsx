"use client";

import { useRef, useState } from "react";
import { RAID_BOSSES } from "@/data";
import type { RaidBoss } from "@/domain/types";
import { speciesKey, pokemonSearchName } from "@/lib/pokemonSearch";
import { formatNumber } from "@/lib/format";
import { scanScreenshot, type ScanResult } from "@/lib/screenshotOcr";
import { usePlannerStore } from "@/store/usePlannerStore";

// One option per species group (Mewtwo X/Y, Giratina A/O, etc. share a key).
const SPECIES_OPTIONS = (() => {
  const byKey = new Map<string, RaidBoss[]>();
  for (const b of RAID_BOSSES) {
    const k = speciesKey(b.name);
    const arr = byKey.get(k) ?? [];
    arr.push(b);
    byKey.set(k, arr);
  }
  return Array.from(byKey.entries())
    .map(([key, bosses]) => {
      const sorted = [...bosses].sort((a, b) => a.sortPriority - b.sortPriority);
      return { key, bosses: sorted, label: pokemonSearchName(sorted[0].name) };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
})();
const OPTION_BY_KEY = new Map(SPECIES_OPTIONS.map((o) => [o.key, o]));

interface Row {
  id: number;
  fileName: string;
  scan: ScanResult;
  key: string; // chosen species key ("" = unassigned)
}

function valueChips(scan: ScanResult): string[] {
  const c: string[] = [];
  if (scan.candy !== undefined) c.push(`Candy ${formatNumber(scan.candy)}`);
  if (scan.xlCandy !== undefined) c.push(`XL ${formatNumber(scan.xlCandy)}`);
  if (scan.megaEnergies.length > 1) {
    if (scan.megaEnergies[0] !== undefined) c.push(`Energy X ${formatNumber(scan.megaEnergies[0])}`);
    if (scan.megaEnergies[1] !== undefined) c.push(`Energy Y ${formatNumber(scan.megaEnergies[1])}`);
  } else if (scan.megaEnergies[0] !== undefined) {
    c.push(`Energy ${formatNumber(scan.megaEnergies[0])}`);
  }
  return c;
}

function applyScan(
  scan: ScanResult,
  bosses: RaidBoss[],
  setSelected: (id: string, v: boolean) => void,
  setCurrent: (id: string, field: "candy" | "xlCandy" | "megaEnergy", v: number) => void,
) {
  const sorted = [...bosses].sort((a, b) => a.sortPriority - b.sortPriority);
  for (const b of sorted) {
    setSelected(b.id, true);
    if (scan.candy !== undefined) setCurrent(b.id, "candy", scan.candy);
    if (scan.xlCandy !== undefined) setCurrent(b.id, "xlCandy", scan.xlCandy);
  }
  const energyBosses = sorted.filter((b) => b.rewardsCurrencies.includes("megaEnergy"));
  const E = scan.megaEnergies;
  if (E.length > 1 && energyBosses.length === E.length) energyBosses.forEach((b, i) => setCurrent(b.id, "megaEnergy", E[i]));
  else if (E.length >= 1) for (const b of energyBosses) setCurrent(b.id, "megaEnergy", E[0]);
}

/**
 * Assisted bulk import: OCR the Candy/XL/Energy from each screenshot (reliable),
 * then the user taps which Pokémon each belongs to. Same species → only the
 * most-recent screenshot is applied (values share one pool).
 */
export function ScreenshotImporter() {
  const setSelected = usePlannerStore((s) => s.setSelected);
  const setCurrent = usePlannerStore((s) => s.setCurrent);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (!files.length) return;
    setBusy(true);
    setRows([]);
    setSummary(null);
    const next: Row[] = [];
    for (let i = 0; i < files.length; i++) {
      setProgress(`Scanning ${i + 1}/${files.length}…${i === 0 ? " (first run downloads the OCR engine)" : ""}`);
      let scan: ScanResult;
      try {
        scan = await scanScreenshot(files[i]);
      } catch {
        scan = { species: null, megaEnergies: [], capturedAt: files[i].lastModified || 0, readAnything: false };
      }
      const key = scan.species && OPTION_BY_KEY.has(scan.species) ? scan.species : "";
      next.push({ id: i, fileName: files[i].name, scan, key });
    }
    setRows(next);
    setBusy(false);
    setProgress("");
  }

  function setKey(id: number, key: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, key } : r)));
    setSummary(null);
  }

  function applyAll() {
    // Same species → keep only the most-recent screenshot (not additive).
    const byKey = new Map<string, Row>();
    for (const r of rows) {
      if (!r.key || !r.scan.readAnything) continue;
      const prev = byKey.get(r.key);
      if (!prev || r.scan.capturedAt > prev.scan.capturedAt) byKey.set(r.key, r);
    }
    const labels: string[] = [];
    for (const [key, r] of byKey) {
      const opt = OPTION_BY_KEY.get(key)!;
      applyScan(r.scan, opt.bosses, setSelected, setCurrent);
      labels.push(opt.label);
    }
    setSummary(labels.length ? `Filled ${labels.length}: ${labels.join(", ")}` : "Pick a Pokémon for each screenshot first.");
  }

  const anyAssignable = rows.some((r) => r.scan.readAnything);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Upload one or more Pokémon screenshots. We read the Candy / XL / Mega Energy from each — then you
        tap which Pokémon it is and we fill that card. Same species → only the most-recent is kept.
      </p>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-sm border-2 border-black/40 bg-gofest-acid px-3 py-2 font-mono text-xs font-extrabold uppercase tracking-wider text-black shadow-brutal transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:shadow-none"
      >
        📷 Upload screenshots
        <span className="rounded-sm border border-black/40 px-1 text-[9px]">beta</span>
      </button>

      {busy ? <p className="text-[11px] text-slate-400">{progress}</p> : null}

      {rows.length ? (
        <ul className="space-y-2">
          {rows.map((r) => {
            const chips = valueChips(r.scan);
            return (
              <li key={r.id} className="rounded-sm border border-white/10 bg-gofest-bg/40 p-2">
                {r.scan.readAnything ? (
                  <>
                    <div className="mb-1.5 flex flex-wrap gap-1">
                      {chips.map((c) => (
                        <span key={c} className="rounded-full bg-black/40 px-2 py-0.5 font-mono text-[11px] text-emerald-200 ring-1 ring-white/10">
                          {c}
                        </span>
                      ))}
                    </div>
                    <select
                      value={r.key}
                      onChange={(e) => setKey(r.id, e.target.value)}
                      className={`w-full rounded-sm border bg-gofest-bg/60 px-2 py-1.5 text-sm outline-none focus:border-gofest-accent2 ${
                        r.key ? "border-gofest-accent2/50 text-white" : "border-white/15 text-slate-300"
                      }`}
                    >
                      <option value="">— pick the Pokémon —</option>
                      {SPECIES_OPTIONS.map((o) => (
                        <option key={o.key} value={o.key}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <p className="text-[11px] text-amber-200">
                    ⚠ Couldn’t read {r.fileName}
                    {r.scan.rawText ? <> — OCR saw: “{r.scan.rawText}”</> : ""}.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {anyAssignable ? (
        <button
          type="button"
          onClick={applyAll}
          className="rounded-sm border-2 border-black/40 bg-gofest-accent2 px-3 py-2 font-mono text-xs font-extrabold uppercase tracking-wider text-black shadow-brutal transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          Apply all →
        </button>
      ) : null}

      {summary ? <p className="text-[11px] text-emerald-300">✓ {summary}</p> : null}
      {rows.length ? <p className="text-[10px] text-slate-500">OCR is best-effort — double-check the filled numbers.</p> : null}
    </div>
  );
}
