"use client";

import { useMemo } from "react";
import { getBoss } from "@/data";
import { usePlannerStore, selectedInPriorityOrder } from "@/store/usePlannerStore";
import { useDragList } from "./useDragList";
import { Sprite } from "@/components/ui/Sprite";

/**
 * One drag-to-rank list over every selected target, in a single global priority
 * order. The top target is served first; when the weekend can't fit everything,
 * the bottom of this list is cut first. Reordering seeds every habitat block, so
 * this one ranking drives the whole plan (a per-block drag on the results step
 * can still override an individual block on top of it).
 */
export function PriorityList() {
  const inputs = usePlannerStore((s) => s.inputs);
  const globalPriority = usePlannerStore((s) => s.globalPriority);
  const setGlobalPriority = usePlannerStore((s) => s.setGlobalPriority);

  const ordered = useMemo(
    () => selectedInPriorityOrder({ inputs, globalPriority }),
    [inputs, globalPriority],
  );
  const drag = useDragList(ordered, setGlobalPriority);

  if (ordered.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Pick some targets in step 1 first — then rank them here.
      </p>
    );
  }

  return (
    <div className="space-y-1.5" {...drag.containerProps}>
      <p className="text-[11px] text-slate-500">
        Drag the ⠿ handle to rank your targets. Highest priority is raided first; the lowest is cut
        first if you can&apos;t fit everything.
      </p>
      {drag.list.map((id, i) => {
        const boss = getBoss(id);
        const name = (boss?.name ?? id).replace(/^Mega /, "");
        return (
          <div
            key={id}
            ref={(el) => drag.setRow(id, el)}
            className={`flex items-center gap-2 rounded-lg border bg-gofest-bg/40 px-2 py-1.5 transition-shadow ${
              drag.dragId === id
                ? "border-gofest-accent2/70 shadow-brutal ring-1 ring-gofest-accent2"
                : "border-white/10"
            }`}
          >
            <span
              {...drag.gripProps(id, name)}
              className="flex h-7 w-5 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded text-slate-500 outline-none focus-visible:ring-2 focus-visible:ring-gofest-accent2 active:cursor-grabbing"
            >
              ⠿
            </span>
            <span className="w-5 shrink-0 text-center font-mono text-xs font-bold text-gofest-accent2">
              {i + 1}
            </span>
            <Sprite src={boss?.sprite} alt={name} size={28} />
            <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{name}</span>
          </div>
        );
      })}
    </div>
  );
}
