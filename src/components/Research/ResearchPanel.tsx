"use client";

import { useState } from "react";
import { RESEARCH_LINES } from "@/data/research";
import { formatNumber } from "@/lib/format";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const CURRENCY_LABELS: Record<string, string> = {
  candy: "Candy",
  xlCandy: "XL Candy",
  megaEnergy: "Mega Energy",
};

export function ResearchPanel() {
  const research = usePlannerStore((s) => s.research);
  const setResearchEnabled = usePlannerStore((s) => s.setResearchEnabled);
  const [open, setOpen] = useState(false);

  const enabledCount = RESEARCH_LINES.filter((l) => research[l.id]).length;

  return (
    <Card className="p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-lg font-semibold">
          GO Fest research{" "}
          {enabledCount > 0 ? (
            <span className="text-xs font-normal text-amber-300">({enabledCount} counted)</span>
          ) : null}
        </span>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-500">
            Tick the research you’ll complete and its Candy / XL is credited toward your raid goals —
            lowering the raids you need. These amounts are an{" "}
            <span className="text-amber-300/90">estimate</span> based on the{" "}
            <span className="text-slate-300">Chicago in-person</span> research (via Serebii) — the free
            Global event this planner targets hasn’t published its research yet, so treat them as a
            prediction.
          </p>

          {RESEARCH_LINES.map((line) => {
            const checked = !!research[line.id];
            return (
              <label
                key={line.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  checked ? "border-gofest-accent2/60 bg-gofest-accent2/10" : "border-white/10 bg-white/5"
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-gofest-accent2"
                  checked={checked}
                  onChange={(e) => setResearchEnabled(line.id, e.target.checked)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold">{line.name}</span>
                    <Badge className="uppercase">{line.kind}</Badge>
                    {line.estimated ? (
                      <Badge className="border-amber-400/40 text-amber-200">est.</Badge>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">📋 {line.availability}</div>

                  {line.rewards.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {line.rewards.map((r, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-emerald-200 ring-1 ring-white/10"
                        >
                          +{formatNumber(r.amount)} {r.label ?? CURRENCY_LABELS[r.currency]}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {line.extras?.length ? (
                    <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
                      {line.extras.map((x, i) => (
                        <li key={i}>• {x}</li>
                      ))}
                    </ul>
                  ) : null}

                  {line.note ? <p className="mt-1 text-[11px] text-slate-500">💡 {line.note}</p> : null}
                </div>
              </label>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}
