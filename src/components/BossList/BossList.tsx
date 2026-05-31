"use client";

import { SORTED_BOSSES } from "@/data";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Card } from "@/components/ui/Card";
import { BossSelectChip } from "./BossSelectChip";

export function BossList() {
  const inputs = usePlannerStore((s) => s.inputs);
  const toggleSelected = usePlannerStore((s) => s.toggleSelected);

  const selectedCount = Object.values(inputs).filter((i) => i.selected).length;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">1. Pick your raid targets</h2>
        <span className="text-sm text-slate-400">{selectedCount} selected</span>
      </div>
      <p className="mb-4 text-sm text-slate-400">
        Raiding everything is a waste of passes. Tap the bosses you actually want to grind.
      </p>
      <div className="flex flex-wrap gap-2">
        {SORTED_BOSSES.map((boss) => (
          <BossSelectChip
            key={boss.id}
            boss={boss}
            selected={!!inputs[boss.id]?.selected}
            onToggle={() => toggleSelected(boss.id)}
          />
        ))}
      </div>
    </Card>
  );
}
