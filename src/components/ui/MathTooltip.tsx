"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A click-to-open popover that shows how a value was calculated. It portals to
 * <body> and positions itself with fixed coordinates from the trigger, so it
 * never gets clipped by a card's overflow. Because the popover holds editable
 * inputs, it's click- (not hover-) triggered and only closes on an outside
 * click, Escape, or a re-click — not when you tab into a field.
 */
export function MathTooltip({
  trigger,
  label,
  children,
}: {
  trigger: ReactNode;
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 16);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    setPos({ top: r.bottom + 6, left });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label ?? "Show the calculation"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="group inline-flex items-center gap-0.5 rounded outline-none"
      >
        {trigger}
        <span aria-hidden className="text-[10px] text-slate-500 transition group-hover:text-gofest-accent2">
          ⓘ
        </span>
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={popRef}
              role="dialog"
              style={{ position: "fixed", top: pos.top, left: pos.left, maxWidth: "min(92vw, 360px)" }}
              className="z-[100] rounded-lg border border-white/15 bg-gofest-bg/95 p-3 text-[11px] text-slate-300 shadow-xl backdrop-blur"
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
