"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";

/**
 * Pointer + keyboard drag-to-reorder for a list of ids. `committed` is the
 * source-of-truth order (should be a stable/memoized reference); `onReorder` is
 * called with the new order when a drag ends or an arrow-key move happens.
 *
 * Returns the order to render (`list`), the id being dragged, a row-ref setter
 * for hit-testing, and the handlers to wire onto the container + each grip.
 */
export function useDragList(committed: string[], onReorder: (ids: string[]) => void) {
  const [draft, setDraft] = useState<string[]>(committed);
  const [dragId, setDragId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());

  // While not dragging, track the committed order.
  useEffect(() => {
    if (!dragId) setDraft(committed);
  }, [committed, dragId]);

  const list = dragId ? draft : committed;

  const setRow = (id: string, el: HTMLElement | null) => {
    if (el) rowRefs.current.set(id, el);
    else rowRefs.current.delete(id);
  };

  const startDrag = (e: ReactPointerEvent, id: string) => {
    e.preventDefault();
    setDraft(committed);
    setDragId(id);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onMove = (e: ReactPointerEvent) => {
    if (!dragId) return;
    const y = e.clientY;
    let overId: string | null = null;
    for (const [id, el] of rowRefs.current) {
      const r = el.getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) {
        overId = id;
        break;
      }
    }
    if (!overId || overId === dragId) return;
    setDraft((cur) => {
      const from = cur.indexOf(dragId);
      const to = cur.indexOf(overId!);
      if (from < 0 || to < 0) return cur;
      const without = cur.filter((x) => x !== dragId);
      const insertAt = from < to ? without.indexOf(overId!) + 1 : without.indexOf(overId!);
      without.splice(insertAt, 0, dragId);
      return without;
    });
  };

  const endDrag = () => {
    if (!dragId) return;
    onReorder(draft);
    setDragId(null);
  };

  // Keyboard reordering on a focused grip.
  const move = (id: string, dir: -1 | 1) => {
    const idx = committed.indexOf(id);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= committed.length) return;
    const next = [...committed];
    [next[idx], next[to]] = [next[to], next[idx]];
    onReorder(next);
  };

  /** Props for a row's drag grip (pointer + Arrow Up/Down). */
  const gripProps = (id: string, label: string) => ({
    role: "button" as const,
    tabIndex: 0,
    "aria-label": `Reorder ${label} — drag, or focus and press Arrow Up / Arrow Down`,
    onPointerDown: (e: ReactPointerEvent) => startDrag(e, id),
    onKeyDown: (e: ReactKeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        move(id, -1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        move(id, 1);
      }
    },
  });

  /** Props for the scroll container that owns the rows. */
  const containerProps = { onPointerMove: onMove, onPointerUp: endDrag, onPointerCancel: endDrag };

  return { list, dragId, setRow, gripProps, containerProps };
}
