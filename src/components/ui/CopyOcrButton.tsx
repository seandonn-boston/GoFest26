"use client";

import { useCopied } from "@/hooks/useCopied";

/**
 * Dev helper: copies the raw Tesseract output to the clipboard so a failed
 * scan can be pasted verbatim into a unit test, tightening the tune-the-parser
 * loop. Renders nothing if there's no raw text to copy.
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
