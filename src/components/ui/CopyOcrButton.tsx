"use client";

import { useCopied } from "@/hooks/useCopied";

/**
 * Copies the raw Tesseract output to the clipboard so a user can paste a misread
 * scan into the feedback form (and we can fold it into the parser corpus).
 * User-facing diagnostic. Renders nothing if there's no raw text to copy.
 */
export function CopyOcrButton({ text }: { text?: string }) {
  const [copied, copy] = useCopied();
  if (!text) return null;

  return (
    <button
      type="button"
      onClick={() => copy(text)}
      className="mt-1 rounded-sm border border-white/15 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-300 transition hover:border-white/30 hover:text-white"
    >
      {copied ? "✓ Copied" : "Copy raw OCR"}
    </button>
  );
}
