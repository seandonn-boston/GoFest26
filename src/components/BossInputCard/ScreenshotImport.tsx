"use client";

import { useRef, useState } from "react";
import { scanScreenshot, type ParsedScreenshot } from "@/lib/screenshotOcr";
import { formatNumber } from "@/lib/format";

type State = "idle" | "scanning" | "done" | "error";

/**
 * Upload a Pokémon GO detail screenshot and OCR the Candy / Candy XL / Mega
 * Energy numbers (in the user's browser), then apply them to the card's fields.
 * Beta — OCR can be imperfect, so the detected values are shown for review.
 */
export function ScreenshotImport({
  onApply,
  dualMega = false,
}: {
  /** Receives the parsed numbers when the user taps Apply. */
  onApply: (parsed: ParsedScreenshot) => void;
  /** Mewtwo lists two Mega Energies (X then Y). */
  dualMega?: boolean;
}) {
  const [state, setState] = useState<State>("idle");
  const [parsed, setParsed] = useState<ParsedScreenshot | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setState("scanning");
    setError("");
    setParsed(null);
    try {
      const result = await scanScreenshot(file);
      setParsed(result);
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
      setState("error");
    }
  }

  function apply() {
    if (parsed) onApply(parsed);
    setState("idle");
    setParsed(null);
  }

  const chips: string[] = [];
  if (parsed) {
    if (parsed.candy !== undefined) chips.push(`Candy ${formatNumber(parsed.candy)}`);
    if (parsed.xlCandy !== undefined) chips.push(`XL ${formatNumber(parsed.xlCandy)}`);
    if (dualMega) {
      if (parsed.megaEnergies[0] !== undefined) chips.push(`Energy X ${formatNumber(parsed.megaEnergies[0])}`);
      if (parsed.megaEnergies[1] !== undefined) chips.push(`Energy Y ${formatNumber(parsed.megaEnergies[1])}`);
    } else if (parsed.megaEnergies[0] !== undefined) {
      chips.push(`Energy ${formatNumber(parsed.megaEnergies[0])}`);
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-gofest-bg/30 p-2.5">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={state === "scanning"}
          className="rounded-sm border border-gofest-accent2/50 bg-gofest-accent2/15 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-gofest-accent2 disabled:opacity-50"
        >
          📷 Scan a screenshot
        </button>
        <span className="rounded-sm border border-amber-400/40 px-1 font-mono text-[9px] uppercase text-amber-200">
          beta
        </span>
      </div>

      {state === "scanning" ? (
        <p className="mt-2 text-[11px] text-slate-400">Scanning… (first run downloads the OCR engine)</p>
      ) : null}
      {state === "error" ? <p className="mt-2 text-[11px] text-rose-300">⚠ {error}</p> : null}

      {state === "done" && parsed ? (
        chips.length ? (
          <div className="mt-2">
            <div className="flex flex-wrap gap-1">
              {chips.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-black/40 px-2 py-0.5 font-mono text-[11px] text-emerald-200 ring-1 ring-white/10"
                >
                  {c}
                </span>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={apply}
                className="rounded-sm border-2 border-black/40 bg-gofest-acid px-3 py-1 font-mono text-[11px] font-extrabold uppercase tracking-wider text-black shadow-brutal active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Apply to fields
              </button>
              <span className="text-[10px] text-slate-500">Double-check before relying on it.</span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-amber-200">
            Couldn’t read the numbers — try a tighter crop of the Candy / XL / Energy area, or enter them
            manually.
          </p>
        )
      ) : null}
    </div>
  );
}
