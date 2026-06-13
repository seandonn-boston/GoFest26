"use client";

import type { ReactNode } from "react";
import { Sprite } from "./Sprite";
import { Copyable } from "./Copyable";

export interface SearchSpriteItem {
  key: string;
  label: string;
  sprite?: string;
  /** Optional ring color (Tailwind class) — used by mega-boost suggestions. */
  ring?: string;
}

/**
 * A labelled Pokémon GO search string: a copy icon in the top-right corner, a
 * row of small sprites of the species it searches for, and the string itself.
 * Clicking the icon — or anywhere in the box — copies the string. One component
 * behind every search string on the page (targets, counters, mega boosts).
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
    </Copyable>
  );
}
