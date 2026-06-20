"use client";

import { useCallback, useState } from "react";
import type { ImportedShot } from "@/store/usePlannerStore";
import { useDialog } from "@/hooks/useDialog";

/** How an imported screenshot reads against the event roster. */
export type ShotStatus = "viable" | "duplicate" | "unreadable" | "unavailable";

const BADGE: Record<"unreadable" | "unavailable", { icon: string; cls: string; title: string }> = {
  unreadable: { icon: "⚠", cls: "bg-amber-400 text-black", title: "Couldn't read this screenshot" },
  unavailable: { icon: "!", cls: "bg-sky-500 text-white", title: "Not available for raids at this event" },
};

/**
 * The grid of uploaded screenshots, each flagged by status: a yellow caution
 * (unreadable) or blue exclamation (not an event raid) in the corner, a big ✕
 * across superseded duplicates, and nothing on a viable shot. Tapping a tile
 * opens the full preview with a Delete button.
 */
export function ScreenshotGrid({
  shots,
  statusOf,
  onDelete,
  size = 56,
}: {
  shots: ImportedShot[];
  statusOf: (s: ImportedShot) => ShotStatus;
  onDelete: (id: string) => void;
  size?: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = shots.find((s) => s.id === openId) ?? null;
  const close = useCallback(() => setOpenId(null), []);
  const dialogRef = useDialog<HTMLDivElement>(open !== null, close);

  if (!shots.length) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {shots.map((s) => {
          const st = statusOf(s);
          const badge = st === "unreadable" ? BADGE.unreadable : st === "unavailable" ? BADGE.unavailable : null;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setOpenId(s.id)}
              className="relative shrink-0 overflow-hidden rounded-sm border border-white/15 bg-black/40 transition hover:border-gofest-accent2/60"
              style={{ width: size, height: size }}
              aria-label={`View ${s.fileName}`}
            >
              {s.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.thumb} alt={s.fileName} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg text-slate-600">?</span>
              )}
              {st === "duplicate" ? (
                <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-black text-rose-300">
                  ✕
                </span>
              ) : null}
              {badge ? (
                <span
                  title={badge.title}
                  className={`absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl-sm text-[10px] font-black ${badge.cls}`}
                >
                  {badge.icon}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {open ? (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-50 flex cursor-zoom-out flex-col items-center justify-center gap-3 bg-black/85 p-4"
          onClick={() => setOpenId(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Screenshot preview: ${open.fileName}`}
        >
          <button
            type="button"
            onClick={() => setOpenId(null)}
            className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/60 px-3 py-1 font-mono text-xs uppercase tracking-wider text-white"
          >
            ✕ Close
          </button>
          {open.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={open.thumb}
              alt={open.fileName}
              className="max-h-[70vh] max-w-full cursor-default rounded-md border border-white/10 object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(open.id);
              setOpenId(null);
            }}
            className="w-full max-w-md cursor-default rounded-sm border-2 border-black/40 bg-rose-500 px-4 py-2.5 font-mono text-xs font-extrabold uppercase tracking-wider text-white shadow-brutal transition active:translate-y-0.5 active:shadow-none"
          >
            🗑 Delete screenshot
          </button>
        </div>
      ) : null}
    </>
  );
}
