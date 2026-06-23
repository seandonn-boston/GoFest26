"use client";

import { SORTED_BOSSES, MEWTWO_X_ID, MEWTWO_Y_ID, getBoss } from "@/data";
import { useHydrated } from "@/hooks/useHydrated";
import { usePlannerResults, useBlockPlan } from "@/hooks/usePlannerResults";
import { usePlannerStore } from "@/store/usePlannerStore";
import { useUiStore, type StepId } from "@/store/useUiStore";
import { isSecondaryForm } from "@/domain";
import type { WeekendBlockPlan, RoadPlan } from "@/domain";
import type { PlanSummary, BossResult, RaidBoss } from "@/domain/types";
import { BossList } from "@/components/BossList/BossList";
import { BossInputCard } from "@/components/BossInputCard/BossInputCard";
import { MewtwoCard } from "@/components/BossInputCard/MewtwoCard";
import { SearchStringBar } from "@/components/BossInputCard/SearchStringBar";
import { CounterSearchBar } from "@/components/BossInputCard/CounterSearchBar";
import { MegaSearchBar } from "@/components/BossInputCard/MegaSearchBar";
import { BulkImportSection } from "@/components/Settings/BulkImportSection";
import { SummaryDashboard } from "@/components/Dashboard/SummaryDashboard";
import { PlanSetup } from "@/components/Dashboard/PlanSetup";
import { ActionDock } from "@/components/Settings/ActionDock";
import { ExportButton } from "@/components/ExportButton";
import { SubstituteLoader } from "@/components/loader/SubstituteLoader";
import { TiltProvider } from "@/components/ui/TiltProvider";
import { SpriteScaleProvider } from "@/components/ui/SpriteScaleProvider";
import { InstallBanner } from "@/components/ui/InstallBanner";
import { BackupControls } from "@/components/Settings/BackupControls";
import { SharedPlanBanner } from "@/components/Settings/SharedPlanBanner";
import { EstimateConfidence } from "@/components/ui/EstimateConfidence";
import { CalibrationPanel } from "@/components/ui/CalibrationPanel";
import { HowToUse } from "@/components/Stepper/HowToUse";
import { StepNav, type StepMeta } from "@/components/Stepper/StepNav";
import { StepFooter } from "@/components/Stepper/StepFooter";

export default function Home() {
  const hydrated = useHydrated();
  const inputs = usePlannerStore((s) => s.inputs);
  const resetAll = usePlannerStore((s) => s.resetAll);
  const summary = usePlannerResults();
  const { weekend: blockPlan, road: roadPlan } = useBlockPlan(summary);

  // Progress signals for the step pills' completion ticks.
  const importCount = usePlannerStore((s) => s.imports.length);
  const priorityCount = usePlannerStore((s) => s.globalPriority.length);
  const anyPlayDay = usePlannerStore((s) => Object.values(s.playDays).some(Boolean));
  const useRemote = usePlannerStore((s) => s.settings.useRemoteRaids);

  const step = useUiStore((s) => s.step);
  const setStep = useUiStore((s) => s.setStep);
  const nextStep = useUiStore((s) => s.nextStep);
  const prevStep = useUiStore((s) => s.prevStep);

  const resultById = new Map(summary.results.map((r) => [r.bossId, r]));
  const mewtwoSelected = !!inputs[MEWTWO_X_ID]?.selected || !!inputs[MEWTWO_Y_ID]?.selected;
  // Mewtwo X & Y share one combined card; multi-form species (Giratina, Dialga,
  // …) collapse to their primary forme's card (shared resource pool); other
  // selected bosses get their own.
  const otherSelectedBosses = SORTED_BOSSES.filter(
    (b) =>
      inputs[b.id]?.selected &&
      b.id !== MEWTWO_X_ID &&
      b.id !== MEWTWO_Y_ID &&
      !isSecondaryForm(b),
  );
  const anySelected = mewtwoSelected || otherSelectedBosses.length > 0;
  const hasGoals = summary.totalRaids.max > 0;

  const steps: StepMeta[] = [
    { id: 1, label: "Pick targets", done: anySelected },
    { id: 2, label: "Import screenshots", done: importCount > 0, optional: true },
    { id: 3, label: "Your numbers", done: anySelected && hasGoals },
    { id: 4, label: "Prioritize", done: priorityCount > 0 || anyPlayDay || useRemote },
    { id: 5, label: "Results", done: hasGoals },
  ];

  if (!hydrated) {
    return <main className="relative z-10 min-h-screen" />;
  }

  return (
    <>
      <InstallBanner />
      <main className="relative z-10 mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <TiltProvider />
        <SpriteScaleProvider>
          <SubstituteLoader>
            <header className="relative mb-8">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-gofest-accent2">
                <span>▚ GO_FEST // 2026</span>
                <span className="text-gofest-accent">GLOBAL // FREE</span>
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

            <HowToUse />
            <SharedPlanBanner />
            <StepNav steps={steps} active={step} onSelect={setStep} />

            <div className="space-y-6">
              <StepContent
                step={step}
                anySelected={anySelected}
                mewtwoSelected={mewtwoSelected}
                otherSelectedBosses={otherSelectedBosses}
                resultById={resultById}
                summary={summary}
                blockPlan={blockPlan}
                roadPlan={roadPlan}
                onResetAll={resetAll}
                onJump={setStep}
              />

              <StepFooter
                step={step}
                onPrev={prevStep}
                onNext={nextStep}
                nextLabel={step === 4 ? "See results" : undefined}
              />
            </div>

            <Disclaimer />
            {/* Plain text, deliberately not a mailto link (harder to scrape). */}
            <p className="pb-8 text-center text-xs text-slate-500">sean@seandonn.io, duh</p>
          </SubstituteLoader>
        </SpriteScaleProvider>
      </main>
      <ActionDock />
    </>
  );
}

function StepContent({
  step,
  anySelected,
  mewtwoSelected,
  otherSelectedBosses,
  resultById,
  summary,
  blockPlan,
  roadPlan,
  onResetAll,
  onJump,
}: {
  step: StepId;
  anySelected: boolean;
  mewtwoSelected: boolean;
  otherSelectedBosses: RaidBoss[];
  resultById: Map<string, BossResult>;
  summary: PlanSummary;
  blockPlan: WeekendBlockPlan;
  roadPlan: RoadPlan;
  onResetAll: () => void;
  onJump: (id: StepId) => void;
}) {
  if (step === 1) {
    return <BossList />;
  }

  if (step === 2) {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Import from screenshots</h2>
          <p className="mt-1 text-sm text-slate-400">
            Optional — drop in your Pokémon&apos;s stat pages and we&apos;ll read the Candy / XL / Mega
            Energy for you. Prefer to type? Skip ahead to your numbers.
          </p>
        </div>
        {anySelected ? (
          <>
            <SearchStringBar />
            <BulkImportSection />
          </>
        ) : (
          <NeedTargets onJump={onJump} />
        )}
      </section>
    );
  }

  if (step === 3) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Enter what you have</h2>
          {anySelected ? (
            <button
              type="button"
              onClick={onResetAll}
              className="text-xs text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
            >
              Reset all
            </button>
          ) : null}
        </div>
        {anySelected ? (
          <>
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
            <CounterSearchBar />
            <MegaSearchBar />
          </>
        ) : (
          <NeedTargets onJump={onJump} />
        )}
      </section>
    );
  }

  if (step === 4) {
    return <PlanSetup roadPlan={roadPlan} capacity={summary.capacity} />;
  }

  // step === 5
  return (
    <>
      <SummaryDashboard summary={summary} blockPlan={blockPlan} roadPlan={roadPlan} />

      {summary.schedule.raids.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Export</h2>
          <p className="text-sm text-slate-400">
            Download your full chronological plan — every raid with its pass type, the Mega buddy to
            evolve, and top counters — as an Excel workbook.
          </p>
          <ExportButton summary={summary} />
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Backup &amp; restore</h2>
        <BackupControls />
      </section>

      <CalibrationPanel />
      <EstimateConfidence />
    </>
  );
}

/** Gentle nudge back to step 1 when a later step needs targets first. */
function NeedTargets({ onJump }: { onJump: (id: StepId) => void }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-slate-400">
      Pick at least one target first.{" "}
      <button
        type="button"
        onClick={() => onJump(1)}
        className="font-semibold text-gofest-accent2 underline-offset-2 hover:underline"
      >
        Go to step 1
      </button>
      .
    </div>
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
        public GO Fest 2026 info and may change — they live in one editable config file. This is an
        unofficial, fan-made planning tool and is not affiliated with Niantic, Nintendo, or The
        Pokémon Company. Pokémon and all related names and sprites are property of their respective
        owners.
      </p>
    </footer>
  );
}
