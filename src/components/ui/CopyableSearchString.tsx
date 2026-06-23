"use client";

import type { ReactNode } from "react";
import { Copyable } from "./Copyable";

export interface SearchSpriteItem {
  key: string;
  label: string;
  sprite?: string;
  /** Optional ring color (Tailwind class) — kept for callers that still pass it. */
  ring?: string;
  /** Optional CSS color to tint this name (from its old sprite-chip border). */
  color?: string;
}

/**
 * A labelled, copyable Pokémon GO search string shown as the actual text — each
 * species name listed (comma-separated, matching what's copied), tinted with the
 * color its sprite chip used to carry (e.g. mega-boost role). Clicking the icon
 * or anywhere in the box copies the string. One component behind every search
 * string on the page (targets, counters, megas).
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
  if (!search) return null;

  return (
    <Copyable search={search} label={label} className="brutal rounded-xl bg-gofest-panel/80 p-3 transition hover:bg-gofest-panel">
      <div className="mb-1 pr-8">
        <span className={`font-mono text-[11px] font-bold uppercase tracking-widest ${accent}`}>{label}</span>
      </div>
      {caption ? <p className="mb-2 text-[11px] text-slate-400">{caption}</p> : null}
      {items.length > 0 ? (
        <p className="font-mono text-sm leading-relaxed">
          {items.map((it, i) => (
            <span key={it.key}>
              {i > 0 ? <span className="text-slate-600">, </span> : null}
              <span style={it.color ? { color: it.color } : undefined} className={it.color ? "" : "text-slate-200"}>
                {it.label}
              </span>
            </span>
          ))}
        </p>
      ) : (
        <p className="break-words font-mono text-sm text-slate-200">{search}</p>
      )}
    </Copyable>
  );
}
