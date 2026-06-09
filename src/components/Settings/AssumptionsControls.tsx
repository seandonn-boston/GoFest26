"use client";

import { type PlannerSettings, isDefaultSettings } from "@/domain/settings";
import { usePlannerStore } from "@/store/usePlannerStore";
import { NumberInput } from "@/components/ui/NumberInput";

const REWARD_CASES: { id: PlannerSettings["rewardCase"]; label: string; hint: string }[] = [
  { id: "optimistic", label: "Best case", hint: "Plan for the highest reward rolls (fewest raids)." },
  { id: "expected", label: "Expected", hint: "Plan around average reward rolls." },
  { id: "safe", label: "Worst case", hint: "Plan for the lowest reward rolls (most raids)." },
];

/** The full set of planning-assumption controls (shared by the action dock). */
export function AssumptionsControls() {
  const settings = usePlannerStore((s) => s.settings);
  const setSettings = usePlannerStore((s) => s.setSettings);
  const resetSettings = usePlannerStore((s) => s.resetSettings);
  const isDefault = isDefaultSettings(settings);

  return (
    <div className="space-y-5">
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
              className={`flex-1 rounded-sm border px-3 py-2 text-sm transition ${
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

      {/* Timing / limits */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NumberInput
          label="Raiders in lobby"
          value={settings.lobbySize}
          min={2}
          max={20}
          onChange={(v) => setSettings({ lobbySize: Math.max(2, Math.min(20, v)) })}
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
          label="Free Orange / day"
          value={settings.freeDailyPerDay}
          min={0}
          max={30}
          onChange={(v) => setSettings({ freeDailyPerDay: v })}
        />
        <NumberInput
          label="Remote raids / day"
          value={settings.remotePassesPerDay}
          min={0}
          max={20}
          onChange={(v) => setSettings({ remotePassesPerDay: v })}
        />
      </div>
      <p className="-mt-2 text-xs text-slate-500">
        Battle time scales with lobby size: a full 20-trainer “red” lobby melts Megas/5★ in ~20–30s
        (Mewtwo ~1 min), while thin lobbies drag on to 4–5 min. Green passes &amp; Link Charges are
        unlimited; Free Orange passes are used first.
      </p>

      {/* Party Play */}
      <div>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-gofest-accent2"
            checked={settings.partyPlay}
            onChange={(e) => setSettings({ partyPlay: e.target.checked })}
          />
          <span className="text-slate-300">
            Party Play
            <span className="block text-xs text-slate-500">
              A 2–4 sub-group inside the lobby (a party isn’t a lobby) hits harder, shaving 5/10/15s
              for a party of 2/3/4.
            </span>
          </span>
        </label>
        {settings.partyPlay ? (
          <div className="mt-2 flex items-center gap-2 pl-6">
            <span className="text-xs text-slate-400">Party size</span>
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSettings({ partySize: n })}
                className={`h-7 w-9 rounded-sm border text-sm transition ${
                  settings.partySize === n
                    ? "border-gofest-accent2 bg-gofest-accent2/15 text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Quick catch */}
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-gofest-accent2"
          checked={settings.quickCatch}
          onChange={(e) => setSettings({ quickCatch: e.target.checked })}
        />
        <span className="text-slate-300">
          Quick catch
          <span className="block text-xs text-slate-500">
            Throw and back out to skip the catch animation — ~5s per catch instead of ~100s.
          </span>
        </span>
      </label>

      {/* Friday remote raids */}
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-gofest-accent2"
          checked={settings.fridayRemoteRaids}
          onChange={(e) => setSettings({ fridayRemoteRaids: e.target.checked })}
        />
        <span className="text-slate-300">
          Raid Friday night (20 remote raids)
          <span className="block text-xs text-slate-500">
            Try-hard mode: +20 remote-raid budget, and the free Friday Orange pass carries over
            (10 Orange on Saturday).
          </span>
        </span>
      </label>

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Every edit updates the calculations live.</p>
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
  );
}
