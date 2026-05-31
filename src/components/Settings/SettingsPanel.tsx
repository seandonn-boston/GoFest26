"use client";

import { useState } from "react";
import { DEFAULT_SETTINGS, type PlannerSettings } from "@/domain/settings";
import { usePlannerStore } from "@/store/usePlannerStore";
import { Card } from "@/components/ui/Card";
import { NumberInput } from "@/components/ui/NumberInput";

const REWARD_CASES: { id: PlannerSettings["rewardCase"]; label: string; hint: string }[] = [
  { id: "optimistic", label: "Best case", hint: "Plan for the highest reward rolls (fewest raids)." },
  { id: "expected", label: "Expected", hint: "Plan around average reward rolls." },
  { id: "safe", label: "Worst case", hint: "Plan for the lowest reward rolls (most raids)." },
];

export function SettingsPanel() {
  const settings = usePlannerStore((s) => s.settings);
  const setSettings = usePlannerStore((s) => s.setSettings);
  const resetSettings = usePlannerStore((s) => s.resetSettings);
  const [open, setOpen] = useState(false);

  const isDefault =
    settings.raidDurationSec === DEFAULT_SETTINGS.raidDurationSec &&
    settings.downtimeSecRange.min === DEFAULT_SETTINGS.downtimeSecRange.min &&
    settings.downtimeSecRange.max === DEFAULT_SETTINGS.downtimeSecRange.max &&
    settings.rewardCase === DEFAULT_SETTINGS.rewardCase &&
    settings.freeDailyPerDay === DEFAULT_SETTINGS.freeDailyPerDay;

  return (
    <Card className="p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
      >
        <span className="text-lg font-semibold">
          Assumptions {isDefault ? "" : <span className="text-xs font-normal text-amber-300">(customized)</span>}
        </span>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="mt-4 space-y-5">
          {/* Reward case */}
          <div>
            <div className="mb-1.5 text-sm text-slate-300">Plan around which reward rolls?</div>
            <div className="flex gap-2">
              {REWARD_CASES.map((rc) => (
                <button
                  key={rc.id}
                  type="button"
                  title={rc.hint}
                  onClick={() => setSettings({ rewardCase: rc.id })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
                    settings.rewardCase === rc.id
                      ? "border-gofest-accent2 bg-gofest-accent2/15 text-white"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25"
                  }`}
                >
                  {rc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberInput
              label="Seconds / raid"
              value={settings.raidDurationSec}
              min={30}
              max={300}
              step={5}
              suffix="s"
              onChange={(v) => setSettings({ raidDurationSec: v })}
            />
            <NumberInput
              label="Min downtime"
              value={settings.downtimeSecRange.min}
              min={0}
              max={300}
              step={5}
              suffix="s"
              onChange={(v) => setSettings({ downtimeSecRange: { ...settings.downtimeSecRange, min: v } })}
            />
            <NumberInput
              label="Max downtime"
              value={settings.downtimeSecRange.max}
              min={0}
              max={300}
              step={5}
              suffix="s"
              onChange={(v) => setSettings({ downtimeSecRange: { ...settings.downtimeSecRange, max: v } })}
            />
            <NumberInput
              label="Free passes / day"
              value={settings.freeDailyPerDay}
              min={0}
              max={30}
              onChange={(v) => setSettings({ freeDailyPerDay: v })}
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Exact per-raid reward amounts live in the code (one editable config file). These knobs
              tune timing and how cautiously to plan.
            </p>
            {!isDefault ? (
              <button
                type="button"
                onClick={resetSettings}
                className="shrink-0 text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
              >
                Reset to defaults
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
