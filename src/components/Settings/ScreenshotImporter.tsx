"use client";

import { useRef, useState } from "react";
import { RAID_BOSSES } from "@/data";
import type { RaidBoss } from "@/domain/types";
import { speciesKey, pokemonSearchName } from "@/lib/pokemonSearch";
import { scanScreenshot, energyForBosses, type ScanResult } from "@/lib/screenshotScan";
import { assetPath, GUIDE_IMAGES } from "@/lib/asset";
import { ScanChips } from "@/components/ui/ScanChips";
import { makeThumbnail } from "@/lib/thumbnail";
import { uploadError, looksHeic, HEIC_HINT } from "@/lib/imageUpload";
import { usePlannerStore, type ImportedShot } from "@/store/usePlannerStore";
import { CopyOcrButton } from "@/components/ui/CopyOcrButton";
import { ImageThumb } from "@/components/ui/ImageThumb";
import { ScreenshotGrid, type ShotStatus } from "./ScreenshotGrid";

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const previewOcr = (t: string) => (t.length > 160 ? `${t.slice(0, 160)}…` : t);
const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

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

/** True when a species group contains a mega-capable boss (has Mega Levels). */
const optionIsMega = (key: string) =>
  (OPTION_BY_KEY.get(key)?.bosses ?? []).some((b) => (b.megaLevelEnergyTotals?.length ?? 0) > 1);

/** Dedupe identity for "most-recent wins": per species AND per screenshot kind,
 *  so a Pokémon's stats card and its Mega Level page coexist (different data). */
const shotDedupeKey = (s: ImportedShot) => `${s.key}|${s.scan.screenshotKind}`;

/** Why a screenshot produced no values — as specific as the scan allows. */
function unreadableMessage(scan: ScanResult, fileName: string): React.ReactNode {
  if (!scan.looksLikePogo) {
    return <>This doesn’t look like a Pokémon GO Pokémon screen ({fileName}).</>;
  }
  return (
    <>
      Looks like Pokémon GO, but the stats aren’t visible in {fileName} — include the Stardust/Candy
      section of the Pokémon’s page.
    </>
  );
}

/** Current-stat fields the importer writes (subset of the store's CurrentField). */
type CurrentField = "candy" | "xlCandy" | "megaEnergy" | "megaLevel";

/** Trailing X / Y form letter of a boss name ("Mega Mewtwo X" → "x"), else null. */
const bossFormLetter = (name: string): "x" | "y" | null => {
  const m = name.trim().toLowerCase().match(/\b([xy])$/);
  return (m?.[1] as "x" | "y") ?? null;
};

/**
 * Apply the current Mega Level read from a Mega Level page to the matching mega
 * boss. For branching megas (X/Y), the page's form letter picks the line — never
 * cross-applied to the sibling. A branching page with no readable form is skipped
 * rather than guessed.
 */
function applyMegaLevel(
  scan: ScanResult,
  bosses: RaidBoss[],
  setCurrent: (id: string, field: CurrentField, v: number) => void,
) {
  if (scan.megaLevel === undefined) return;
  const megaBosses = bosses.filter((b) => (b.megaLevelEnergyTotals?.length ?? 0) > 1);
  if (!megaBosses.length) return;
  const form = scan.megaLevelForm ?? null;
  const targets = form
    ? megaBosses.filter((b) => bossFormLetter(b.name) === form)
    : megaBosses.length === 1
      ? megaBosses
      : []; // ambiguous branching page (no form) → don't guess
  for (const b of targets) {
    const max = (b.megaLevelEnergyTotals?.length ?? 1) - 1;
    setCurrent(b.id, "megaLevel", Math.max(0, Math.min(max, Math.round(scan.megaLevel))));
  }
}

function applyScan(
  scan: ScanResult,
  bosses: RaidBoss[],
  setSelected: (id: string, v: boolean) => void,
  setCurrent: (id: string, field: CurrentField, v: number) => void,
) {
  const sorted = [...bosses].sort((a, b) => a.sortPriority - b.sortPriority);
  for (const b of sorted) setSelected(b.id, true);
  // The stats card supplies candy / XL / held energy. The Mega Level page does
  // not (its energy value is unreliable), so only the card writes those.
  if (scan.screenshotKind === "card") {
    for (const b of sorted) {
      if (scan.candy !== undefined) setCurrent(b.id, "candy", scan.candy);
      if (scan.xlCandy !== undefined) setCurrent(b.id, "xlCandy", scan.xlCandy);
    }
    const energyBosses = sorted.filter((b) => b.rewardsCurrencies.includes("megaEnergy"));
    const vals = energyForBosses(scan.megaEnergies, energyBosses);
    energyBosses.forEach((b, i) => {
      if (vals[i] !== undefined) setCurrent(b.id, "megaEnergy", vals[i]);
    });
  }
  // The Mega Level page supplies the current Mega Level.
  applyMegaLevel(scan, sorted, setCurrent);
}

/**
 * Assisted bulk import: OCR the Candy/XL/Energy from each screenshot (reliable),
 * then the user taps which Pokémon each belongs to. Uploaded screenshots persist
 * (session storage) as a managed grid; each resource pull can be deleted (red ✕)
 * or applied on its own (green ›), or all at once. Same species → only the most-
 * recent screenshot is applied (values share one pool).
 */
export function ScreenshotImporter() {
  const setSelected = usePlannerStore((s) => s.setSelected);
  const setCurrent = usePlannerStore((s) => s.setCurrent);
  const setScreenshot = usePlannerStore((s) => s.setScreenshot);
  const imports = usePlannerStore((s) => s.imports);
  const addImports = usePlannerStore((s) => s.addImports);
  const removeImport = usePlannerStore((s) => s.removeImport);
  const setImportKey = usePlannerStore((s) => s.setImportKey);
  const clearImports = usePlannerStore((s) => s.clearImports);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  /** A Mega Level screenshot already uploaded for this species group. */
  const hasMegaLevelShot = (key: string) =>
    imports.some((i) => i.key === key && i.scan.screenshotKind === "megaLevel" && i.scan.readAnything);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (!files.length) return;
    setBusy(true);
    setSummary(null);
    const next: ImportedShot[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const blank: ScanResult = {
        species: null,
        detectedName: null,
        megaEnergies: [],
        items: [],
        looksLikePogo: false,
        screenshotKind: "card",
        capturedAt: file.lastModified || 0,
        readAnything: false,
      };
      const tooBig = uploadError(file);
      if (tooBig) {
        next.push({ id: uid(), fileName: file.name, thumb: null, scan: blank, key: "", error: tooBig });
        continue;
      }
      setProgress(`Scanning ${i + 1}/${files.length}…${i === 0 ? " (first run downloads the OCR engine)" : ""}`);
      let scan: ScanResult;
      let error: string | undefined;
      try {
        scan = await scanScreenshot(file);
      } catch {
        scan = blank;
        if (looksHeic(file)) error = HEIC_HINT;
      }
      const thumb = await makeThumbnail(file);
      const key = scan.species && OPTION_BY_KEY.has(scan.species) ? scan.species : "";
      next.push({ id: uid(), fileName: file.name, thumb, scan, key, error });
    }
    addImports(next);
    setBusy(false);
    setProgress("");
    if (next.length && next.every((r) => !r.scan.readAnything)) {
      setSummary(
        next.some((r) => r.scan.looksLikePogo)
          ? "No values read — make sure each screenshot shows the Stardust/Candy section of a Pokémon's page."
          : "None of those look like Pokémon GO Pokémon screens.",
      );
    }
  }

  // Same species → only the latest screenshot counts; earlier ones are duplicates.
  const latestIdByKey = new Map<string, string>();
  for (const s of imports) {
    if (!s.key) continue;
    const k = shotDedupeKey(s);
    const curId = latestIdByKey.get(k);
    const cur = curId ? imports.find((x) => x.id === curId) : undefined;
    if (!cur || s.scan.capturedAt >= cur.scan.capturedAt) latestIdByKey.set(k, s.id);
  }
  const isSuperseded = (s: ImportedShot) => !!s.key && latestIdByKey.get(shotDedupeKey(s)) !== s.id;
  const assignableOf = (s: ImportedShot) => s.scan.readAnything && !!s.key && OPTION_BY_KEY.has(s.key);

  const statusOf = (s: ImportedShot): ShotStatus => {
    if (isSuperseded(s)) return "duplicate";
    if (s.error || !s.scan.readAnything) return "unreadable";
    if (!assignableOf(s)) return "unavailable";
    return "viable";
  };

  function applyOne(s: ImportedShot) {
    const opt = OPTION_BY_KEY.get(s.key);
    if (!opt) return;
    applyScan(s.scan, opt.bosses, setSelected, setCurrent);
    if (s.thumb) setScreenshot(s.key, s.thumb, s.scan.capturedAt);
    setSummary(`Filled ${opt.label}.`);
  }

  function applyAll() {
    // Most-recent per species AND kind, so a Pokémon's stats card and its Mega
    // Level page both apply (card → candy/XL/energy, Mega Level page → mega level).
    // Each writes only its own fields, so neither clobbers the other.
    const byKey = new Map<string, ImportedShot>();
    for (const s of imports) {
      if (!assignableOf(s)) continue;
      const k = shotDedupeKey(s);
      const prev = byKey.get(k);
      if (!prev || s.scan.capturedAt >= prev.scan.capturedAt) byKey.set(k, s);
    }
    const labels = new Set<string>();
    for (const s of byKey.values()) {
      const opt = OPTION_BY_KEY.get(s.key)!;
      applyScan(s.scan, opt.bosses, setSelected, setCurrent);
      if (s.thumb) setScreenshot(s.key, s.thumb, s.scan.capturedAt);
      labels.add(opt.label);
    }
    setSummary(labels.size ? `Filled ${labels.size}: ${[...labels].join(", ")}` : "Assign a Pokémon to a screenshot first.");
  }

  function del(id: string) {
    removeImport(id);
    setSummary(null);
  }

  const anyAssignable = imports.some(assignableOf);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Upload one or more Pokémon screenshots. We read the Candy / XL / Mega Energy from each — then you
        tap which Pokémon it is and apply it. Same species → only the most-recent is kept.
      </p>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-sm border-2 border-black/40 bg-gofest-acid px-3 py-2 font-mono text-xs font-extrabold uppercase tracking-wider text-black shadow-brutal transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:shadow-none"
        >
          📷 Upload screenshots
          <span className="rounded-sm border border-black/40 px-1 text-[9px]">beta</span>
        </button>
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          aria-expanded={showGuide}
          className="flex items-center gap-1 text-[11px] font-medium text-sky-300 underline-offset-2 hover:underline"
        >
          <span aria-hidden>ⓘ</span> Which screenshots?
        </button>
        {imports.length ? (
          <button
            type="button"
            onClick={() => {
              clearImports();
              setSummary(null);
            }}
            className="text-[11px] text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <p className="text-[11px] text-amber-300">
        <span aria-hidden>⚠</span> English (game language) screenshots only at this time — other languages aren&apos;t read yet.
      </p>

      {showGuide ? (
        <div className="rounded-sm border border-sky-400/30 bg-sky-500/[0.06] p-3">
          <p className="mb-2 text-[11px] text-slate-300">
            Two kinds of screenshot are read. Upload the first for any Pokémon; add the second for mega-capable
            (and Primal) targets to capture its current Mega Level. Locate the <b>exact</b> Pokémon you want to max
            — not just any of the same species.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <figure className="m-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetPath(GUIDE_IMAGES.card)}
                alt="Example Pokémon stats page showing Candy, Candy XL and Mega Energy"
                className="w-full rounded-sm border border-white/10"
              />
              <figcaption className="mt-1 text-[10px] text-slate-400">
                <b className="text-emerald-300">1 · Pokémon page</b> — any Pokémon. Reads Candy / XL / Mega Energy.
              </figcaption>
            </figure>
            <figure className="m-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetPath(GUIDE_IMAGES.megaLevel)}
                alt="Example Mega Level page showing the level banner and Mega Energy"
                className="w-full rounded-sm border border-white/10"
              />
              <figcaption className="mt-1 text-[10px] text-slate-400">
                <b className="text-purple-300">2 · Mega Level page</b> — mega/Primal only. Reads the current Mega Level.
                Branching megas (Charizard X/Y, Mewtwo X/Y) need one per line.
              </figcaption>
            </figure>
          </div>
        </div>
      ) : null}

      {busy ? <p className="text-[11px] text-slate-400">{progress}</p> : null}

      {/* Grid of uploaded screenshots with per-shot status (above the pulls). */}
      {imports.length ? (
        <div className="space-y-1.5">
          <ScreenshotGrid shots={imports} statusOf={statusOf} onDelete={del} />
          <p className="text-[10px] text-slate-500">
            <span className="text-amber-300">⚠</span> unreadable · <span className="text-sky-300">!</span> not in this
            event · <span className="text-rose-300">✕</span> duplicate (a newer one is used). Tap a tile to preview or
            delete it.
          </p>
        </div>
      ) : null}

      {/* Resource pulls — delete (red ✕) or apply just this one (green ›). */}
      {imports.length ? (
        <ul className="space-y-2">
          {imports.map((s) => {
            const assignable = assignableOf(s);
            const superseded = isSuperseded(s);
            return (
              <li key={s.id} className="flex items-start gap-2 rounded-sm border border-white/10 bg-gofest-bg/40 p-2">
                <button
                  type="button"
                  onClick={() => del(s.id)}
                  aria-label={`Delete ${s.fileName}`}
                  title="Delete this screenshot and its values"
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rose-400/50 bg-rose-500/15 text-xs font-bold text-rose-300 transition hover:bg-rose-500/30"
                >
                  ✕
                </button>
                {s.thumb ? <ImageThumb src={s.thumb} alt={s.fileName} size={56} /> : null}

                <div className="min-w-0 flex-1">
                  {s.scan.readAnything ? (
                    <>
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <ScanChips scan={s.scan} />
                        {s.scan.megaLevel !== undefined ? (
                          <span
                            title="Current Mega Level read from the Mega Level page"
                            className="rounded-sm bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-bold text-purple-200 ring-1 ring-purple-400/40"
                          >
                            Mega L{s.scan.megaLevel}
                            {s.scan.megaLevelForm ? ` ${s.scan.megaLevelForm.toUpperCase()}` : ""}
                          </span>
                        ) : null}
                      </div>
                      {!assignable && s.scan.detectedName ? (
                        <p className="mb-1.5 text-[11px] text-sky-300">
                          ❗ {cap(s.scan.detectedName)} isn’t available for raids during this event — pick another below.
                        </p>
                      ) : null}
                      {assignable && s.scan.screenshotKind === "card" && optionIsMega(s.key) && !hasMegaLevelShot(s.key) ? (
                        <p className="mb-1.5 text-[11px] text-purple-300">
                          ➕ Mega target — also upload its <b>Mega Level</b> screenshot to set the current Mega Level
                          (tap ⓘ above for the example).
                        </p>
                      ) : null}
                      {superseded ? (
                        <p className="mb-1.5 text-[11px] text-amber-300/80">
                          ↪ Duplicate {OPTION_BY_KEY.get(s.key)?.label ?? cap(s.key)} — a newer screenshot is used by
                          “Apply all”. You can still apply this one with ›.
                        </p>
                      ) : null}
                      <select
                        value={s.key}
                        onChange={(e) => setImportKey(s.id, e.target.value)}
                        className={`w-full rounded-sm border bg-gofest-bg/60 px-2 py-1.5 text-sm outline-none focus:border-gofest-accent2 focus-visible:ring-2 focus-visible:ring-gofest-accent2 ${
                          s.key ? "border-gofest-accent2/50 text-white" : "border-white/15 text-slate-300"
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
                    <div>
                      <p className="text-[11px] text-amber-200 break-words">
                        ⚠ {s.error ? s.error : unreadableMessage(s.scan, s.fileName)}
                      </p>
                      {!s.error && s.scan.looksLikePogo && s.scan.rawText ? (
                        <>
                          <p className="text-[10px] text-slate-500 break-words">OCR saw: “{previewOcr(s.scan.rawText)}”</p>
                          <CopyOcrButton text={s.scan.rawText} />
                        </>
                      ) : null}
                    </div>
                  )}
                </div>

                {assignable ? (
                  <button
                    type="button"
                    onClick={() => applyOne(s)}
                    aria-label={`Apply ${OPTION_BY_KEY.get(s.key)?.label ?? "this"} screenshot`}
                    title="Apply just this screenshot's values"
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-emerald-400/50 bg-emerald-500/15 text-lg font-bold leading-none text-emerald-300 transition hover:bg-emerald-500/30"
                  >
                    ›
                  </button>
                ) : null}
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
      {imports.length ? <p className="text-[10px] text-slate-500">OCR is best-effort — double-check the filled numbers.</p> : null}
    </div>
  );
}
