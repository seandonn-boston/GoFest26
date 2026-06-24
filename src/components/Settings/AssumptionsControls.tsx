"use client";

import { isDefaultSettings } from "@/domain/settings";
import { GAME_CONFIG } from "@/data/config";
import { RESEARCH_LINES } from "@/data/research";
import { formatNumber } from "@/lib/format";
import { usePlannerStore } from "@/store/usePlannerStore";
import { NumberInput } from "@/components/ui/NumberInput";
import { Badge } from "@/components/ui/Badge";

// Assumed same-type Mega buddy levels (the +30% Level-4 tier is opt-in per boss).
const BUDDY_LEVELS: { level: number; label: string; hint: string }[] = [
  { level: 1, label: "L1 Base", hint: "1 evolution — Candy bonus only, no XL boost." },
  { level: 2, label: "L2 High", hint: "7 evolutions — +10% Candy XL per same-type catch." },
  { level: 3, label: "L3 Max", hint: "30 evolutions — +25% Candy XL (the typical leveled mega)." },
];
const buddyXlPct = (level: number) => Math.round((GAME_CONFIG.megaCatchBoost.xlByLevel[level] ?? 0) * 100);

const RESEARCH_CURRENCY: Record<string, string> = {
  candy: "Candy",
  xlCandy: "XL Candy",
  megaEnergy: "Mega Energy",
};

/** The full set of planning-assumption controls (shared by the action dock). */
export function AssumptionsControls() {
  const settings = usePlannerStore((s) => s.settings);
  const setSettings = usePlannerStore((s) => s.setSettings);
  const resetSettings = usePlannerStore((s) => s.resetSettings);
  const research = usePlannerStore((s) => s.research);
  const setResearchEnabled = usePlannerStore((s) => s.setResearchEnabled);
  const isDefault = isDefaultSettings(settings);

  return (
    <div className="space-y-5">
      {/* The reward-case (best / expected / worst) selector now lives on the
          results page, right under the headline numbers it drives. */}

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

      {/* Mega buddy XL boost */}
      <div>
        <div className="mb-1.5 text-sm text-slate-300">Assumed Mega buddy level (same-type XL boost)</div>
        <div className="flex gap-2">
          {BUDDY_LEVELS.map((b) => (
            <button
              key={b.level}
              type="button"
              title={b.hint}
              onClick={() => setSettings({ megaBuddyLevel: b.level })}
              className={`flex-1 rounded-sm border px-3 py-2 text-sm transition ${
                settings.megaBuddyLevel === b.level
                  ? "border-gofest-accent2 bg-gofest-accent2/15 text-white"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25"
              }`}
            >
              {b.label}
              <span className="block text-[11px] text-slate-400">+{buddyXlPct(b.level)}% XL</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          A same-type Mega/Primal buddy raises Candy XL on catches, scaling with its Mega Level — applied to
          every boss whose “Mega buddy” toggle is on. Five 2026 species reach{" "}
          <span className="text-white">Level 4 (+30%)</span>; enable it per boss on
          Fighting/Psychic/Grass/Poison/Dark/Flying/Dragon targets.
        </p>
      </div>

      {/* What the XL numbers count — readily-available scope, so the math is trustable */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-relaxed">
        <div className="mb-1 font-semibold text-slate-200">What the Candy-XL numbers count</div>
        <p className="text-slate-400">
          <span className="text-emerald-300">Counted:</span> in-person 5★/Legendary catch (guaranteed 3 +
          completion bonus), Mega-tier catch (0–3), the same-type Mega buddy boost above, and GO Fest research
          XL when enabled.
        </p>
        <p className="mt-1 text-slate-400">
          <span className="text-rose-300">Not counted:</span> XL from transferring or trading, egg hatches, or
          buddy walking. Running from the encounter yields Mega Energy only — no catch XL.
        </p>
      </div>

      {/* Quick-catch is now chosen per species per time block on each target row
          (it forfeits catch Candy/XL for speed), not as a global assumption. */}

      {/* GO Fest research — credited toward goals, on by default */}
      <div>
        <div className="mb-1.5 text-sm text-slate-300">GO Fest research</div>
        <p className="mb-2 text-xs text-slate-500">
          Counts each line’s Candy / XL toward your goals (fewer raids needed). An{" "}
          <span className="text-amber-300/90">estimate</span> from the Chicago in-person research (via
          Serebii) — the free Global event hasn’t published its tasks yet.
        </p>
        <div className="space-y-2">
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
                    {line.estimated ? <Badge className="border-amber-400/40 text-amber-200">est.</Badge> : null}
                  </div>
                  {line.rewards.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {line.rewards.map((r, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-emerald-200 ring-1 ring-white/10"
                        >
                          +{formatNumber(r.amount)} {r.label ?? RESEARCH_CURRENCY[r.currency]}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {line.note ? <p className="mt-1 text-[11px] text-slate-500">💡 {line.note}</p> : null}
                </div>
              </label>
            );
          })}
        </div>
      </div>

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
