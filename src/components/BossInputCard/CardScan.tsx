"use client";

import { useRef, useState } from "react";
import { scanScreenshot, energyChip, type ScanResult } from "@/lib/screenshotScan";
import { makeThumbnail } from "@/lib/thumbnail";
import { uploadError, looksHeic, HEIC_HINT } from "@/lib/imageUpload";
import { formatNumber } from "@/lib/format";
import { CopyOcrButton } from "@/components/ui/CopyOcrButton";

const previewOcr = (t: string) => (t.length > 160 ? `${t.slice(0, 160)}…` : t);

type State = "idle" | "scanning" | "done" | "error";

/**
 * Per-card screenshot scan: OCR a single Pokémon detail screenshot (in the
 * browser) and apply its Candy / XL / Mega Energy to this card — but only if
 * the screenshot's species (read from its labels) matches this card's Pokémon.
 * Beta — the detected values are shown for review before applying.
 */

export function CardScan({
  onApply,
  onThumb,
  expectedSpecies,
  bossLabel,
}: {
  onApply: (scan: ScanResult) => void;
  /** Persist a preview thumbnail (data URL) for this species when applied. */
  onThumb?: (thumb: string, capturedAt: number) => void;
  /** Normalized species key this card expects (e.g. "mewtwo"). */
  expectedSpecies: string;
  /** Display name for mismatch messages. */
  bossLabel: string;
}) {
  const [state, setState] = useState<State>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    const tooBig = uploadError(file);
    if (tooBig) {
      setError(tooBig);
      setState("error");
      return;
    }
    setState("scanning");
    setError("");
    setResult(null);
    setThumb(null);
    try {
      const scan = await scanScreenshot(file);
      if (scan.species && scan.species !== expectedSpecies) {
        const cap = scan.species.charAt(0).toUpperCase() + scan.species.slice(1);
        setError(`That looks like a ${cap} screenshot, not ${bossLabel} — it won't be applied here.`);
        setState("error");
        return;
      }
      setThumb(await makeThumbnail(file));
      setResult(scan);
      setState("done");
    } catch (err) {
      setError(looksHeic(file) ? HEIC_HINT : err instanceof Error ? err.message : "Scan failed");
      setState("error");
    }
  }

  function apply() {
    if (result) onApply(result);
    if (thumb && onThumb) onThumb(thumb, result?.capturedAt ?? Date.now());
    setState("idle");
    setResult(null);
    setThumb(null);
  }

  const chips: string[] = [];
  const items: string[] = [];
  if (result) {
    if (result.candy !== undefined) chips.push(`Candy ${formatNumber(result.candy)}`);
    if (result.xlCandy !== undefined) chips.push(`XL ${formatNumber(result.xlCandy)}`);
    for (const e of result.megaEnergies) chips.push(energyChip(e));
    for (const i of result.items) items.push(`${i.name} ${formatNumber(i.value)}`);
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-2">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={state === "scanning"}
          className="flex items-center gap-1.5 rounded-sm border border-gofest-accent2/50 bg-gofest-accent2/15 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-gofest-accent2 disabled:opacity-50"
        >
          📷 Scan screenshot
        </button>
        <span className="rounded-sm border border-amber-400/40 px-1 font-mono text-[9px] uppercase text-amber-200">beta</span>
      </div>

      {state === "scanning" ? <p className="mt-1.5 text-[11px] text-slate-400">Scanning…</p> : null}
      {state === "error" ? <p className="mt-1.5 text-[11px] text-rose-300 break-words">⚠ {error}</p> : null}
      {state === "done" ? (
        chips.length ? (
          <div className="mt-1.5">
            <div className="flex flex-wrap gap-1">
              {chips.map((c, i) => (
                <span key={`${i}-${c}`} className="rounded-full bg-black/40 px-2 py-0.5 font-mono text-[11px] text-emerald-200 ring-1 ring-white/10">
                  {c}
                </span>
              ))}
              {items.map((c, i) => (
                <span key={`item-${i}-${c}`} className="rounded-full bg-black/30 px-2 py-0.5 font-mono text-[11px] text-slate-400 ring-1 ring-white/10">
                  {c}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={apply}
              className="mt-1.5 rounded-sm border-2 border-black/40 bg-gofest-acid px-2.5 py-1 font-mono text-[11px] font-extrabold uppercase tracking-wider text-black shadow-brutal active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            >
              Apply
            </button>
          </div>
        ) : (
          <div className="mt-1.5">
            <p className="text-[11px] text-amber-200">
              {result && !result.looksLikePogo
                ? "That doesn’t look like a Pokémon GO Pokémon screen."
                : "Looks like Pokémon GO, but no stats are visible — include the Stardust/Candy section, or enter the values manually."}
            </p>
            {result?.looksLikePogo && result.rawText ? (
              <>
                <p className="text-[10px] text-slate-500 break-words">OCR saw: “{previewOcr(result.rawText)}”</p>
                <CopyOcrButton text={result.rawText} />
              </>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}
