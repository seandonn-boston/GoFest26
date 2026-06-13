"use client";

import type { ReactNode } from "react";
import { useCopied } from "@/hooks/useCopied";

/** Clipboard glyph (or a check once copied). */
export function ClipboardGlyph({ copied }: { copied?: boolean }) {
  if (copied) return <span className="font-mono text-[11px] font-bold leading-none">✓</span>;
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

/**
 * A region that copies a Pokémon GO `search` string when clicked anywhere, with
 * a copy icon pinned to its top-right corner. The icon is a real button so
 * keyboard / assistive-tech users have a focusable control; the surrounding
 * click is a mouse/touch convenience. Renders children plainly if `search` is
 * empty.
 */
export function Copyable({
  search,
  label,
  children,
  className = "",
}: {
  search: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const [copied, copy] = useCopied();
  if (!search) return <div className={className}>{children}</div>;
  return (
    <div onClick={() => copy(search)} className={`relative cursor-pointer ${className}`} title={`Tap to copy ${label}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          copy(search);
        }}
        aria-label={copied ? "Copied to clipboard" : `Copy ${label} as a search string`}
        className="absolute right-2 top-2 z-[1] inline-flex items-center justify-center rounded-sm border border-white/20 bg-black/50 px-1.5 py-1 text-slate-300 transition hover:border-white/50 hover:text-white"
      >
        <ClipboardGlyph copied={copied} />
      </button>
      {children}
    </div>
  );
}

/**
 * Inline variant for compact rows (a list of tinted names / sprites). The whole
 * row copies `search` on click/Enter/Space, with a trailing copy glyph.
 */
export function CopyableInline({
  search,
  label,
  children,
  className = "",
}: {
  search: string;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const [copied, copy] = useCopied();
  if (!search) return <div className={className}>{children}</div>;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => copy(search)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          copy(search);
        }
      }}
      aria-label={copied ? "Copied to clipboard" : `Copy ${label} as a search string`}
      title={`Tap to copy ${label}`}
      className={`group cursor-pointer rounded outline-none focus-visible:ring-1 focus-visible:ring-gofest-accent2 ${className}`}
    >
      {children}
      <span className="text-slate-500 transition group-hover:text-slate-200" aria-hidden>
        <ClipboardGlyph copied={copied} />
      </span>
    </div>
  );
}
