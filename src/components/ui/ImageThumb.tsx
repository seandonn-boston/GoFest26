"use client";

import { useCallback, useState } from "react";
import { useDialog } from "@/hooks/useDialog";

/**
 * A small clickable screenshot thumbnail. Tapping it opens a full-screen
 * lightbox so the user can confirm the upload was read correctly. `src` is a
 * data URL (persisted) or object URL (session).
 */
export function ImageThumb({ src, alt, size = 48 }: { src: string; alt: string; size?: number }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  // Escape, focus-trap, scroll-lock, and focus-restore for the lightbox.
  const dialogRef = useDialog<HTMLDivElement>(open, close);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 overflow-hidden rounded-sm border border-white/15 bg-black/40 transition hover:border-gofest-accent2/60"
        style={{ width: size, height: size }}
        aria-label={`View ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </button>

      {open ? (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-full max-w-full rounded-md border border-white/10 object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/60 px-3 py-1 font-mono text-xs uppercase tracking-wider text-white"
          >
            ✕ Close
          </button>
        </div>
      ) : null}
    </>
  );
}
