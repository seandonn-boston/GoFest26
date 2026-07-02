"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  collapsible = false,
}: {
  label: string;
  search: string;
  items: SearchSpriteItem[];
  caption?: ReactNode;
  accent?: string;
  /** Clamp the plain search text to two rows behind a clickable “…” that expands
   *  it. The copy button stays in the corner, never hidden behind the ellipsis. */
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Only offer the “…” when the (clamped) text actually spills past two rows.
  useEffect(() => {
    if (!collapsible) return;
    const measure = () => {
      const el = textRef.current;
      if (el) setOverflowing(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [collapsible, search, expanded]);

  if (!search) return null;

  return (
    <Copyable
      search={search}
      label={label}
      className="brutal rounded-xl bg-gofest-panel/80 p-3 transition hover:bg-gofest-panel"
    >
      <div className="mb-1 pr-8">
        <span className={`font-mono text-[13px] font-bold uppercase tracking-widest ${accent}`}>{label}</span>
      </div>
      {caption ? <p className="mb-2 text-[13px] text-slate-400">{caption}</p> : null}
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
      ) : collapsible ? (
        <div className="relative">
          <p ref={textRef} className={`break-words font-mono text-sm text-slate-200 ${expanded ? "" : "line-clamp-2"}`}>
            {search}
          </p>
          {expanded ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(false);
              }}
              className="mt-1 font-mono text-[12px] font-bold uppercase tracking-wider text-gofest-acid hover:underline"
            >
              Show less
            </button>
          ) : overflowing ? (
            // Sits at the end of the clamped second row; a fade makes it read as
            // the “…”. Stops propagation so it expands instead of copying.
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
              aria-label="Show the full search string"
              className="absolute bottom-0 right-0 z-[1] flex items-end bg-gradient-to-l from-gofest-panel from-60% to-transparent pl-8 pr-0.5 font-mono text-base font-bold leading-none text-gofest-acid hover:text-white"
            >
              …
            </button>
          ) : null}
        </div>
      ) : (
        <p className="break-words font-mono text-sm text-slate-200">{search}</p>
      )}
    </Copyable>
  );
}
