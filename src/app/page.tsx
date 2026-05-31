"use client";

import { SORTED_BOSSES, MEWTWO_X_ID, MEWTWO_Y_ID, getBoss } from "@/data";
import { useHydrated } from "@/hooks/useHydrated";
import { usePlannerResults } from "@/hooks/usePlannerResults";
import { usePlannerStore } from "@/store/usePlannerStore";
import { BossList } from "@/components/BossList/BossList";
import { BossInputCard } from "@/components/BossInputCard/BossInputCard";
import { MewtwoCard } from "@/components/BossInputCard/MewtwoCard";
import { SummaryDashboard } from "@/components/Dashboard/SummaryDashboard";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { LocationPicker } from "@/components/Settings/LocationPicker";
import { ScheduleView } from "@/components/Schedule/ScheduleView";
import { ExportButton } from "@/components/ExportButton";

export default function Home() {
  const hydrated = useHydrated();
  const inputs = usePlannerStore((s) => s.inputs);
  const resetAll = usePlannerStore((s) => s.resetAll);
  const summary = usePlannerResults();

  const resultById = new Map(summary.results.map((r) => [r.bossId, r]));
  const mewtwoSelected = !!inputs[MEWTWO_X_ID]?.selected || !!inputs[MEWTWO_Y_ID]?.selected;
  // Mewtwo X & Y share one combined card; other selected bosses get their own.
  const otherSelectedBosses = SORTED_BOSSES.filter(
    (b) => inputs[b.id]?.selected && b.id !== MEWTWO_X_ID && b.id !== MEWTWO_Y_ID,
  );
  const anySelected = mewtwoSelected || otherSelectedBosses.length > 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">
          GO Fest 2026 <span className="text-gofest-mewtwo">Raid Planner</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          July 11–12, 2026 · Work out exactly how many raids you need to max your Pokémon —
          starting with Mega Mewtwo X &amp; Y.
        </p>
      </header>

      {!hydrated ? (
        <div className="rounded-2xl border border-white/10 bg-gofest-panel/80 p-8 text-center text-slate-400">
          Loading your plan…
        </div>
      ) : (
        <div className="space-y-6">
          <BossList />

          <LocationPicker />

          {anySelected ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">2. Enter what you have</h2>
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
                >
                  Reset all
                </button>
              </div>
              {mewtwoSelected ? (
                <MewtwoCard
                  bossX={getBoss(MEWTWO_X_ID)!}
                  bossY={getBoss(MEWTWO_Y_ID)!}
                  resultX={resultById.get(MEWTWO_X_ID)}
                  resultY={resultById.get(MEWTWO_Y_ID)}
                />
              ) : null}
              {otherSelectedBosses.map((boss) => {
                const result = resultById.get(boss.id);
                return result ? <BossInputCard key={boss.id} boss={boss} result={result} /> : null;
              })}
            </section>
          ) : null}

          <SummaryDashboard summary={summary} />

          <SettingsPanel />

          <ScheduleView schedule={summary.schedule} />

          {summary.schedule.raids.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold">Export</h2>
              <p className="text-sm text-slate-400">
                Download your full chronological plan — every raid with its pass type, the Mega
                buddy to evolve, and top counters — as an Excel workbook.
              </p>
              <ExportButton summary={summary} />
            </section>
          ) : null}

          <Disclaimer />
        </div>
      )}
    </main>
  );
}

function Disclaimer() {
  return (
    <footer className="space-y-2 px-1 pb-8 text-xs text-slate-500">
      <p>
        Reward amounts vary per raid, so raid counts are shown as ranges (best-case to worst-case
        rolls). The “with mega buddy” figure assumes a matching Mega-Evolved buddy is boosting your
        Candy/XL gains.
      </p>
      <p>
        Game values (Mega Energy rewards, Mewtwo mega-level costs, the boss roster) are based on
        public GO Fest 2026 info and may change — they live in one editable config file. This is a
        fan-made planning tool and is not affiliated with Niantic or The Pokémon Company.
      </p>
    </footer>
  );
}
