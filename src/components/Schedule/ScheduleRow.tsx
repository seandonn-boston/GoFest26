"use client";

import type { ScheduledRaid } from "@/domain/types";
import { getBoss } from "@/data";
import { TierBadge, Badge } from "@/components/ui/Badge";
import { Sprite } from "@/components/ui/Sprite";

const PASS_LABEL: Record<ScheduledRaid["passType"], string> = {
  orange: "Orange (free)",
  green: "Green / Link",
  remote: "Remote",
};

export function ScheduleRow({ raid, index }: { raid: ScheduledRaid; index: number }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-2">
      <span className="mt-1 w-5 shrink-0 text-right text-xs text-slate-500">{index}</span>
      <Sprite src={getBoss(raid.bossId)?.sprite} alt={raid.bossName} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{raid.bossName}</span>
          <TierBadge tier={raid.tier} />
          <Badge>{PASS_LABEL[raid.passType]}</Badge>
          {raid.recommendedBuddyMegaName ? (
            <Badge className="border-gofest-mewtwo/40 text-purple-200">
              buddy: {raid.recommendedBuddyMegaName}
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-400">{raid.counters.join(" · ")}</p>
      </div>
    </div>
  );
}
