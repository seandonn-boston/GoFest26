"use client";

import type { ReactNode } from "react";
import { useCopied } from "@/hooks/useCopied";
import { Sprite } from "./Sprite";

export interface SearchSpriteItem {
  key: string;
  label: string;
  sprite?: string;
  /** Optional ring color (Tailwind class) — used by mega-boost suggestions. */
  ring?: string;
}

/**
 * A labelled, copyable Pokémon GO search string with a copy icon and a row of
 * small sprites of the species it searches for. One component behind every
 * search string on the page (targets, counters, mega boosts) so they look and
 * behave identically.
 */
export function CopyableSearchString({
  label,
  search,
  items,
  caption,
  accent = "text-gofest-acid",
}: {
  label: string;
  search: string;
  items: SearchSpriteItem[];
  caption?: ReactNode;
  accent?: string;
}) {
  const [copied, copy] = useCopied();
  if (!search) return null;

  return (
    <div className="brutal rounded-xl bg-gofest-panel/80 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className={`font-mono text-[11px] font-bold uppercase tracking-widest ${accent}`}>{label}</span>
        <button
          type="button"
          onClick={() => copy(search)}
          aria-label={copied ? "Copied to clipboard" : `Copy ${label}`}
          className="inline-flex items-center gap-1 rounded-sm border-2 border-black/40 bg-gofest-accent2 px-2.5 py-1 font-mono text-[11px] font-extrabold uppercase tracking-wider text-black shadow-brutal transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          <ClipboardIcon />
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      {caption ? <p className="mb-2 text-[11px] text-slate-400">{caption}</p> : null}
      {items.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {items.map((it) => (
            <span
              key={it.key}
              title={it.label}
              className={`inline-flex rounded-full bg-black/30 ${it.ring ? `ring-2 ${it.ring}` : "ring-1 ring-white/10"}`}
            >
              <Sprite src={it.sprite} alt={it.label} size={22} />
            </span>
          ))}
        </div>
      ) : null}
      <code className="block max-h-24 overflow-y-auto break-words rounded-sm border border-white/10 bg-gofest-bg/60 p-2 font-mono text-xs leading-relaxed text-slate-200">
        {search}
      </code>
    </div>
  );
}

function ClipboardIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}
