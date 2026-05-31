"use client";

import { SORTED_BOSSES, MEWTWO_X_ID, MEWTWO_Y_ID, getBoss } from "@/data";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Card } from "@/components/ui/Card";
import { BossSelectChip } from "./BossSelectChip";

export function BossList() {
  const inputs = usePlannerStore((s) => s.inputs);
  const toggleSelected = usePlannerStore((s) => s.toggleSelected);
  const setSelected = usePlannerStore((s) => s.setSelected);

  const selectedCount = Object.values(inputs).filter((i) => i.selected).length;

  // Mega Mewtwo X & Y share one Mewtwo, so they get a single combined chip.
  const mewtwoX = getBoss(MEWTWO_X_ID)!;
  const mewtwoSelected = !!inputs[MEWTWO_X_ID]?.selected || !!inputs[MEWTWO_Y_ID]?.selected;
  const toggleMewtwo = () => {
    const next = !mewtwoSelected;
    setSelected(MEWTWO_X_ID, next);
    setSelected(MEWTWO_Y_ID, next);
  };

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
        <BossSelectChip
          key="mega-mewtwo"
          boss={mewtwoX}
          label="Mega Mewtwo X & Y"
          selected={mewtwoSelected}
          onToggle={toggleMewtwo}
        />
        {SORTED_BOSSES.filter((b) => b.id !== MEWTWO_X_ID && b.id !== MEWTWO_Y_ID).map((boss) => (
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
