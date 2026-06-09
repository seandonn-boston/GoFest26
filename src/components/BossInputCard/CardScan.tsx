"use client";

import { useRef, useState } from "react";
import { scanScreenshot, type ScanResult } from "@/lib/screenshotOcr";
import { formatNumber } from "@/lib/format";

type State = "idle" | "scanning" | "done" | "error";

/**
 * Per-card screenshot scan: OCR a single Pokémon detail screenshot (in the
 * browser) and apply its Candy / XL / Mega Energy to this card — but only if
 * the screenshot's species (read from its labels) matches this card's Pokémon.
 * Beta — the detected values are shown for review before applying.
 */
export function CardScan({
  onApply,
  expectedSpecies,
  bossLabel,
  dualMega = false,
}: {
  onApply: (scan: ScanResult) => void;
  /** Normalized species key this card expects (e.g. "mewtwo"). */
  expectedSpecies: string;
  /** Display name for mismatch messages. */
  bossLabel: string;
  dualMega?: boolean;
}) {
  const [state, setState] = useState<State>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setState("scanning");
    setError("");
    setResult(null);
    try {
      const scan = await scanScreenshot(file);
      if (scan.species && scan.species !== expectedSpecies) {
        const cap = scan.species.charAt(0).toUpperCase() + scan.species.slice(1);
        setError(`That looks like a ${cap} screenshot, not ${bossLabel} — it won't be applied here.`);
        setState("error");
        return;
      }
      setResult(scan);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
      setState("error");
    }
  }

  function apply() {
    if (result) onApply(result);
    setState("idle");
    setResult(null);
  }

  const chips: string[] = [];
  if (result) {
    if (result.candy !== undefined) chips.push(`Candy ${formatNumber(result.candy)}`);
    if (result.xlCandy !== undefined) chips.push(`XL ${formatNumber(result.xlCandy)}`);
    if (dualMega) {
      if (result.megaEnergies[0] !== undefined) chips.push(`Energy X ${formatNumber(result.megaEnergies[0])}`);
      if (result.megaEnergies[1] !== undefined) chips.push(`Energy Y ${formatNumber(result.megaEnergies[1])}`);
    } else if (result.megaEnergies[0] !== undefined) {
      chips.push(`Energy ${formatNumber(result.megaEnergies[0])}`);
    }
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
      {state === "error" ? <p className="mt-1.5 text-[11px] text-rose-300">⚠ {error}</p> : null}
      {state === "done" ? (
        chips.length ? (
          <div className="mt-1.5">
            <div className="flex flex-wrap gap-1">
              {chips.map((c) => (
                <span key={c} className="rounded-full bg-black/40 px-2 py-0.5 font-mono text-[11px] text-emerald-200 ring-1 ring-white/10">
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
          <p className="mt-1.5 text-[11px] text-amber-200">Couldn’t read it — try a tighter crop or enter manually.</p>
        )
      ) : null}
    </div>
  );
}
