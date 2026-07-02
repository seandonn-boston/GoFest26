"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Pointer + keyboard drag-to-reorder for a list of ids. `committed` is the
 * source-of-truth order; `onReorder` is called with the new order when a drag
 * ends or an arrow-key move happens.
 *
 * Returns the order to render (`list`), the id being dragged, a row-ref setter
 * for hit-testing, and the handlers to wire onto the container + each grip.
 */
export function useDragList(committed: string[], onReorder: (ids: string[]) => void) {
  const [draft, setDraft] = useState<string[]>(committed);
  const [dragId, setDragId] = useState<string | null>(null);
  // Announced via the caller's aria-live region after a keyboard move — pointer
  // drags are visible, but an Arrow-key reorder is otherwise silent to a screen
  // reader. Render as: <span aria-live="polite" role="status" className="sr-only">
  const [announcement, setAnnouncement] = useState("");
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());

  // While not dragging, track the committed order. Compared by value (not
  // reference) so a caller passing a fresh array each render can't ping-pong
  // this effect into an infinite render loop.
  useEffect(() => {
    if (dragId) return;
    setDraft((cur) => (sameOrder(cur, committed) ? cur : committed));
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
  const move = (id: string, dir: -1 | 1, label: string) => {
    const idx = committed.indexOf(id);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= committed.length) return;
    const next = [...committed];
    [next[idx], next[to]] = [next[to], next[idx]];
    onReorder(next);
    setAnnouncement(`${label} moved to position ${to + 1} of ${next.length}`);
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
        move(id, -1, label);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        move(id, 1, label);
      }
    },
  });

  /** Props for the scroll container that owns the rows. */
  const containerProps = { onPointerMove: onMove, onPointerUp: endDrag, onPointerCancel: endDrag };

  return { list, dragId, setRow, gripProps, containerProps, announcement };
}
