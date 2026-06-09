"use client";

import { useRef, useState } from "react";
import { RAID_BOSSES } from "@/data";
import type { RaidBoss } from "@/domain/types";
import { speciesKey } from "@/lib/pokemonSearch";
import { formatNumber } from "@/lib/format";
import { scanScreenshot, type ScanResult } from "@/lib/screenshotOcr";
import { usePlannerStore } from "@/store/usePlannerStore";

type Status = "applied" | "duplicate" | "unmatched" | "unreadable";
interface Row {
  file: string;
  when: number;
  status: Status;
  title: string;
  detail: string;
}

const STATUS_STYLE: Record<Status, string> = {
  applied: "border-gofest-acid/50 text-gofest-acid",
  duplicate: "border-white/15 text-slate-400",
  unmatched: "border-amber-400/50 text-amber-200",
  unreadable: "border-rose-400/50 text-rose-300",
};
const STATUS_ICON: Record<Status, string> = { applied: "✓", duplicate: "↩", unmatched: "⚠", unreadable: "✕" };

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
  if (E.length > 1 && energyBosses.length === E.length) {
    energyBosses.forEach((b, i) => setCurrent(b.id, "megaEnergy", E[i]));
  } else if (E.length >= 1) {
    for (const b of energyBosses) setCurrent(b.id, "megaEnergy", E[0]);
  }
}

/**
 * Batch screenshot import: OCR each Pokémon detail screenshot, identify the
 * species by its Candy/Energy label, match it to a raid target and fill the
 * card. Same species → only the most-recent screenshot is used (values come
 * from a shared pool, so they're not additive). Non-targets/unreadable are flagged.
 */
export function ScreenshotImporter() {
  const setSelected = usePlannerStore((s) => s.setSelected);
  const setCurrent = usePlannerStore((s) => s.setCurrent);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);

  // Roster grouped by species key (Mewtwo X/Y, Giratina A/O, etc. share a key).
  const bossesByKey = new Map<string, RaidBoss[]>();
  for (const b of RAID_BOSSES) {
    const k = speciesKey(b.name);
    (bossesByKey.get(k) ?? bossesByKey.set(k, []).get(k)!).push(b);
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (!files.length) return;
    setBusy(true);
    setRows(null);

    const scans: { file: File; scan: ScanResult }[] = [];
    for (let i = 0; i < files.length; i++) {
      setProgress(`Scanning ${i + 1}/${files.length}…${i === 0 ? " (first run downloads the OCR engine)" : ""}`);
      try {
        scans.push({ file: files[i], scan: await scanScreenshot(files[i]) });
      } catch {
        scans.push({
          file: files[i],
          scan: { species: null, megaEnergies: [], capturedAt: files[i].lastModified || 0, readAnything: false },
        });
      }
    }

    const out: Row[] = [];
    const bySpecies = new Map<string, { file: File; scan: ScanResult; bosses: RaidBoss[] }[]>();

    for (const { file, scan } of scans) {
      if (!scan.readAnything || !scan.species) {
        out.push({ file: file.name, when: scan.capturedAt, status: "unreadable", title: "Couldn't read", detail: "No Candy / XL / Energy found — try a tighter crop." });
        continue;
      }
      const bosses = bossesByKey.get(scan.species);
      if (!bosses?.length) {
        out.push({ file: file.name, when: scan.capturedAt, status: "unmatched", title: cap(scan.species), detail: "Not a GO Fest raid target — skipped." });
        continue;
      }
      (bySpecies.get(scan.species) ?? bySpecies.set(scan.species, []).get(scan.species)!).push({ file, scan, bosses });
    }

    for (const [, cands] of bySpecies) {
      cands.sort((a, b) => b.scan.capturedAt - a.scan.capturedAt); // most recent first
      const [winner, ...older] = cands;
      applyScan(winner.scan, winner.bosses, setSelected, setCurrent);
      out.push({
        file: winner.file.name,
        when: winner.scan.capturedAt,
        status: "applied",
        title: winner.bosses.map((b) => b.name).join(" / "),
        detail: summarize(winner.scan),
      });
      for (const o of older) {
        out.push({ file: o.file.name, when: o.scan.capturedAt, status: "duplicate", title: cap(winner.scan.species ?? ""), detail: "Older screenshot of the same species — ignored." });
      }
    }

    out.sort((a, b) => order(a.status) - order(b.status) || b.when - a.when);
    setRows(out);
    setBusy(false);
    setProgress("");
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Upload one or more Pokémon detail screenshots. We read the Candy / XL / Mega Energy, identify
        each by its label, and fill the matching card. Same species → only the most-recent screenshot is
        kept (values share one pool). Non-targets are flagged.
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

      {rows ? (
        <ul className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={i} className={`rounded-sm border bg-gofest-bg/40 p-2 ${STATUS_STYLE[r.status]}`}>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-sm">{STATUS_ICON[r.status]}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-100">{r.title}</div>
                  <div className="text-[11px] text-slate-400">{r.detail}</div>
                </div>
                <span className="shrink-0 font-mono text-[9px] text-slate-500">{when(r.when)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {rows ? <p className="text-[10px] text-slate-500">OCR is best-effort — double-check the filled numbers.</p> : null}
    </div>
  );
}

function summarize(scan: ScanResult): string {
  const parts: string[] = [];
  if (scan.candy !== undefined) parts.push(`Candy ${formatNumber(scan.candy)}`);
  if (scan.xlCandy !== undefined) parts.push(`XL ${formatNumber(scan.xlCandy)}`);
  scan.megaEnergies.forEach((v, i) =>
    parts.push(`Energy${scan.megaEnergies.length > 1 ? ` ${i === 0 ? "X" : "Y"}` : ""} ${formatNumber(v)}`),
  );
  return parts.length ? `Filled · ${parts.join(" · ")}` : "Filled";
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Unknown";
}

function order(s: Status): number {
  return { applied: 0, unmatched: 1, duplicate: 2, unreadable: 3 }[s];
}

function when(ms: number): string {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}
