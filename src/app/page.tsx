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
import { ResearchPanel } from "@/components/Research/ResearchPanel";
import { LocationPicker } from "@/components/Settings/LocationPicker";
import { ScheduleView } from "@/components/Schedule/ScheduleView";
import { ExportButton } from "@/components/ExportButton";
import { SubstituteLoader } from "@/components/loader/SubstituteLoader";
import { TiltProvider } from "@/components/ui/TiltProvider";
import { SpriteScaleProvider } from "@/components/ui/SpriteScaleProvider";

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

  if (!hydrated) {
    return <main className="relative z-10 min-h-screen" />;
  }

  return (
    <main className="relative z-10 mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <TiltProvider />
      <SpriteScaleProvider>
      <SubstituteLoader>
        <header className="relative mb-8">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-gofest-accent2">
            <span>▚ GO_FEST // 2026</span>
            <span className="text-gofest-accent">● REC</span>
          </div>
          <h1 className="glitch-title mt-3 text-[2.6rem] font-extrabold leading-[0.82] tracking-tighter sm:text-7xl">
            GO FEST
            <br />
            <span className="text-gofest-mewtwo">RAID</span> PLANNER
          </h1>
          <div className="hairline mt-4" />
          <div className="mt-3 overflow-hidden">
            <div className="ticker font-mono text-[11px] uppercase tracking-widest text-slate-400">
              <span>
                JUL 11–12 2026 · 10AM–7PM LOCAL · FREE GLOBAL EVENT · MEGA MEWTWO X &amp; Y DEBUT ·
                SUPER MEGA RAIDS · MAX YOUR XL CANDY &amp; MEGA ENERGY ·&nbsp;&nbsp;&nbsp;
              </span>
              <span aria-hidden="true">
                JUL 11–12 2026 · 10AM–7PM LOCAL · FREE GLOBAL EVENT · MEGA MEWTWO X &amp; Y DEBUT ·
                SUPER MEGA RAIDS · MAX YOUR XL CANDY &amp; MEGA ENERGY ·&nbsp;&nbsp;&nbsp;
              </span>
            </div>
          </div>
        </header>

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
                return result ? (
                  <BossInputCard
                    key={boss.id}
                    boss={boss}
                    result={result}
                    planningRaidsPerHour={summary.schedule.planningRaidsPerHour}
                  />
                ) : null;
              })}
            </section>
          ) : null}

          <SummaryDashboard summary={summary} />

          <ResearchPanel />

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
      </SubstituteLoader>
      </SpriteScaleProvider>
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
