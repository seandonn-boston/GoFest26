"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getBoss } from "@/data";
import { usePlannerStore, selectedInPriorityOrder } from "@/store/usePlannerStore";
import { Sprite } from "@/components/ui/Sprite";

/**
 * Drag-to-rank list of the selected species. Priority drives bar fill order and,
 * when a block is over capacity, which species get filled first vs. cut. Each
 * row's ✕ removes the species entirely (deselects it — the card and its
 * selection tile drop too). Reordering uses pointer events so it works on touch.
 * Hidden until two+ species are selected.
 */
export function PriorityRanker() {
  const inputs = usePlannerStore((s) => s.inputs);
  const priorityOrder = usePlannerStore((s) => s.priorityOrder);
  const setPriorityOrder = usePlannerStore((s) => s.setPriorityOrder);
  const setSelected = usePlannerStore((s) => s.setSelected);

  const committed = useMemo(() => selectedInPriorityOrder({ inputs, priorityOrder }), [inputs, priorityOrder]);
  const [draft, setDraft] = useState<string[]>(committed);
  const [dragId, setDragId] = useState<string | null>(null);
  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  // While not dragging, the rendered list tracks the committed (store) order.
  useEffect(() => {
    if (!dragId) setDraft(committed);
  }, [committed, dragId]);

  const list = dragId ? draft : committed;
  if (list.length < 2) return null;

  function startDrag(e: React.PointerEvent, id: string) {
    e.preventDefault();
    setDraft(committed);
    setDragId(id);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onMove(e: React.PointerEvent) {
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
  }

  function endDrag() {
    if (!dragId) return;
    setPriorityOrder(draft);
    setDragId(null);
  }

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Priority order</h3>
        <span className="text-[10px] text-slate-500">Drag to rank · ✕ to remove · lowest is cut first when over budget</span>
      </div>
      <ol className="space-y-1.5" onPointerMove={onMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        {list.map((id, i) => {
          const boss = getBoss(id);
          if (!boss) return null;
          const dragging = dragId === id;
          return (
            <li
              key={id}
              ref={(el) => {
                if (el) rowRefs.current.set(id, el);
                else rowRefs.current.delete(id);
              }}
              className={`flex items-center gap-2 rounded-lg border bg-gofest-bg/40 px-2 py-1.5 transition-shadow ${
                dragging ? "border-gofest-accent2/70 shadow-brutal ring-1 ring-gofest-accent2" : "border-white/10"
              }`}
            >
              <span
                role="button"
                aria-label={`Drag ${boss.name} to reorder`}
                onPointerDown={(e) => startDrag(e, id)}
                className="flex h-7 w-5 shrink-0 cursor-grab touch-none select-none items-center justify-center text-slate-500 active:cursor-grabbing"
              >
                ⠿
              </span>
              <span className="w-4 text-center font-mono text-xs text-slate-500">{i + 1}</span>
              <Sprite src={boss.sprite} alt={boss.name} size={24} />
              <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{boss.name}</span>
              <button
                type="button"
                aria-label={`Remove ${boss.name}`}
                title="Remove from targets"
                onClick={() => setSelected(id, false)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-rose-400/50 bg-rose-500/15 text-xs font-bold text-rose-300 transition hover:bg-rose-500/30"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
