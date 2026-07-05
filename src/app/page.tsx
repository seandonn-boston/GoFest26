"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { SORTED_BOSSES, MEWTWO_X_ID, MEWTWO_Y_ID, getBoss } from "@/data";
import { useHydrated } from "@/hooks/useHydrated";
import { useSwipeNav } from "@/hooks/useSwipeNav";
import { usePlannerResults, useBlockPlan, useRemoteAutoBalance } from "@/hooks/usePlannerResults";
import { usePlannerStore } from "@/store/usePlannerStore";
import { useUiStore, STEP_COUNT, type StepId } from "@/store/useUiStore";
import { isSecondaryForm } from "@/domain";
import type { WeekendBlockPlan, RoadPlan } from "@/domain";
import type { PlanSummary, BossResult, RaidBoss } from "@/domain/types";
import { BossList } from "@/components/BossList/BossList";
import { BossInputCard } from "@/components/BossInputCard/BossInputCard";
import { MewtwoCard } from "@/components/BossInputCard/MewtwoCard";
import { CardJumpNav } from "@/components/BossInputCard/CardJumpNav";
import { CounterSearchBar } from "@/components/BossInputCard/CounterSearchBar";
import { MegaSearchBar } from "@/components/BossInputCard/MegaSearchBar";
import { Disclosure } from "@/components/ui/Disclosure";
import { AdventureEffects } from "@/components/Dashboard/AdventureEffects";
import { PixelIcon } from "@/components/ui/PixelIcon";
import { BulkImportSection } from "@/components/Settings/BulkImportSection";
import { ResourcesOnHand } from "@/components/Dashboard/ResourcesOnHand";
import { SummaryDashboard } from "@/components/Dashboard/SummaryDashboard";
import { ResultsStep } from "@/components/Dashboard/ResultsStep";
import { CostStep } from "@/components/Dashboard/CostStep";
import { RemotePrioritizer } from "@/components/Dashboard/RemoteStep";
import { PlanSetup } from "@/components/Dashboard/PlanSetup";
import { ActionDock } from "@/components/Settings/ActionDock";
import { RenderSettings } from "@/components/ui/RenderSettings";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { useTiltStore } from "@/store/useTiltStore";
import { SubstituteLoader } from "@/components/loader/SubstituteLoader";
import { TiltProvider } from "@/components/ui/TiltProvider";
import { SpriteScaleProvider } from "@/components/ui/SpriteScaleProvider";
import { InstallBanner } from "@/components/ui/InstallBanner";
import { GlitchText } from "@/components/ui/GlitchText";
import { SharedPlanBanner } from "@/components/Settings/SharedPlanBanner";
import { LocationPrompt } from "@/components/Settings/LocationPrompt";
import { HowToUse } from "@/components/Stepper/HowToUse";
import { WeekOverview } from "@/components/Dashboard/WeekOverview";
import { StepNav, type StepMeta } from "@/components/Stepper/StepNav";
import { LayoutToggle } from "@/components/Stepper/LayoutToggle";
import { ExpandAllToggle } from "@/components/Stepper/ExpandAllToggle";
import { StepNudge, missingStep } from "@/components/Stepper/StepNudge";

export default function Home() {
  const hydrated = useHydrated();
  const inputs = usePlannerStore((s) => s.inputs);
  const resetAll = usePlannerStore((s) => s.resetAll);
  const summary = usePlannerResults();
  const { weekend: blockPlan, road: roadPlan } = useBlockPlan(summary);
  // Re-balance remote passes while in auto mode. Mounted HERE (not inside a
  // step component) so tapping Auto-balance works on the Remote step too — in
  // stepper layout only the active step's components exist, and this once lived
  // only in the GO Fest step's dashboard, so the button did nothing elsewhere.
  useRemoteAutoBalance(summary);

  // Progress signals for the step pills' completion ticks.
  const anyPlayDay = usePlannerStore((s) => Object.values(s.playDays).some(Boolean));
  const useRemote = usePlannerStore((s) => s.settings.useRemoteRaids);

  const step = useUiStore((s) => s.step);
  const setStep = useUiStore((s) => s.setStep);
  const nextStep = useUiStore((s) => s.nextStep);
  const prevStep = useUiStore((s) => s.prevStep);
  const layout = useUiStore((s) => s.layout);
  const setLayout = useUiStore((s) => s.setLayout);
  // Single-page is a motion/layout indulgence: reduce-motion and gyroscope tilt
  // both force the one-at-a-time stepper (tilt needs the card in view to lean).
  const reduceMotion = useReduceMotion();
  const tiltEnabled = useTiltStore((s) => s.enabled);
  const single = layout === "single" && !reduceMotion && !tiltEnabled;

  // In single-page mode a "step change" is a scroll to that section, not a swap.
  const goToStep = (id: StepId) => {
    if (single) document.getElementById(`step-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    else setStep(id);
  };

  // Swipe left → next step, right → previous (stepper only; one-page just scrolls).
  const swipe = useSwipeNav({ onLeft: nextStep, onRight: prevStep });

  // Stepper: changing step jumps back to the top so each step starts at its
  // heading. Skip the first render (don't fight the browser's scroll restore) and
  // don't run at all in single-page mode, where the user scrolls freely.
  const firstStepRender = useRef(true);
  useEffect(() => {
    if (firstStepRender.current) {
      firstStepRender.current = false;
      return;
    }
    if (!single) window.scrollTo({ top: 0 });
  }, [step, single]);

  // Single-page: highlight the step nav pill for the section currently in view.
  const [activeSection, setActiveSection] = useState<StepId>(1);
  useEffect(() => {
    if (!single || typeof IntersectionObserver === "undefined") return;
    const seen = new Map<number, number>(); // step id → intersection ratio
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = Number(e.target.getAttribute("data-step"));
          if (id) seen.set(id, e.isIntersecting ? e.intersectionRatio : 0);
        }
        let best = 1;
        let bestRatio = -1;
        for (const [id, ratio] of seen) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = id;
          }
        }
        if (bestRatio > 0) setActiveSection(best as StepId);
      },
      { rootMargin: "-64px 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    for (let i = 1; i <= STEP_COUNT; i++) {
      const el = document.getElementById(`step-${i}`);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [single]);

  const resultById = new Map(summary.results.map((r) => [r.bossId, r]));
  const mewtwoSelected = !!inputs[MEWTWO_X_ID]?.selected || !!inputs[MEWTWO_Y_ID]?.selected;
  // Mewtwo X & Y share one combined card; multi-form species (Giratina, Dialga,
  // …) collapse to their primary forme's card (shared resource pool); other
  // selected bosses get their own.
  const otherSelectedBosses = SORTED_BOSSES.filter(
    (b) => inputs[b.id]?.selected && b.id !== MEWTWO_X_ID && b.id !== MEWTWO_Y_ID && !isSecondaryForm(b),
  );
  const anySelected = mewtwoSelected || otherSelectedBosses.length > 0;
  const hasGoals = summary.totalRaids.max > 0;

  const steps: StepMeta[] = [
    { id: 1, label: "Pick targets", done: anySelected },
    { id: 2, label: "Enter what you have", done: anySelected && hasGoals },
    { id: 3, label: "Road of Legends", done: anyPlayDay },
    { id: 4, label: "GO Fest Prioritizer", done: hasGoals },
    { id: 5, label: "Remote Prioritizer", done: useRemote },
    { id: 6, label: "Results", done: hasGoals },
    { id: 7, label: "Cost", done: hasGoals },
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
              <div className="flex items-center justify-between font-mono text-[12px] uppercase tracking-[0.3em] text-gofest-accent2">
                <span>▚ GO_FEST // 2026</span>
                <span className="text-gofest-accent">GLOBAL // FREE</span>
              </div>
              <GlitchText
                as="h1"
                className="glitch-title mt-3 text-[2.6rem] font-extrabold leading-[0.82] tracking-tighter sm:text-7xl"
                text={"GO FEST\nRAID PLANNER"}
                colorWords={{ RAID: "text-gofest-mewtwo" }}
              />
              <div className="hairline mt-4" />
              <div className="mt-3 overflow-hidden">
                <div className="ticker font-mono text-[13px] uppercase tracking-widest text-slate-400">
                  <span>
                    JUL 11–12 2026 · 10AM–7PM LOCAL · FREE GLOBAL EVENT · MEGA MEWTWO X &amp; Y DEBUT · SUPER MEGA RAIDS ·
                    MAX YOUR XL CANDY &amp; MEGA ENERGY ·&nbsp;&nbsp;&nbsp;
                  </span>
                  <span aria-hidden="true">
                    JUL 11–12 2026 · 10AM–7PM LOCAL · FREE GLOBAL EVENT · MEGA MEWTWO X &amp; Y DEBUT · SUPER MEGA RAIDS ·
                    MAX YOUR XL CANDY &amp; MEGA ENERGY ·&nbsp;&nbsp;&nbsp;
                  </span>
                </div>
              </div>
            </header>

            <HowToUse />
            <LocationPrompt />
            <SharedPlanBanner />
            <div className="mb-2 flex items-center justify-end gap-2">
              <ExpandAllToggle />
              <LayoutToggle layout={layout} onChange={setLayout} />
            </div>

            {single ? (
              <SinglePageFlow
                steps={steps}
                anySelected={anySelected}
                mewtwoSelected={mewtwoSelected}
                otherSelectedBosses={otherSelectedBosses}
                resultById={resultById}
                summary={summary}
                blockPlan={blockPlan}
                roadPlan={roadPlan}
                onResetAll={resetAll}
                onJump={goToStep}
              />
            ) : (
              <div className="space-y-6" {...swipe}>
                {/* The 7-day path frames every plan step (RoL → Prioritizer →
                    Remote → Cost) — the whole event at a glance, one tap to the
                    step that edits each piece. */}
                {step >= 3 ? (
                  <WeekOverview summary={summary} blockPlan={blockPlan} roadPlan={roadPlan} onJump={setStep} />
                ) : null}
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
              </div>
            )}

            <Disclaimer />
            {/* The step navigator lives at the foot of the flow and sticks to the
                bottom of the viewport, so it's always a thumb-reach away. */}
            <StepNav steps={steps} active={single ? activeSection : step} onSelect={goToStep} />
          </SubstituteLoader>
        </SpriteScaleProvider>
      </main>
      <ActionDock />
      <RenderSettings />
    </>
  );
}

/** A numbered divider that opens each section of the single-page flow, tying it
 *  back to the step nav's numbering (✓ once the step's work is done). */
function SectionDivider({ meta, first }: { meta: StepMeta; first: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${first ? "" : "border-t border-white/10 pt-6"}`}>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold ${
          meta.done
            ? "border-emerald-400 bg-emerald-400 text-black"
            : "border-gofest-accent2 bg-gofest-accent2/20 text-gofest-accent2"
        }`}
      >
        {meta.done ? "✓" : meta.id}
      </span>
      <span className="font-mono text-[12px] uppercase tracking-[0.25em] text-slate-400">{meta.label}</span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

/** Every step stacked into one continuous page. Each section is anchored
 *  (`#step-N`) so the step nav can smooth-scroll to it and the scroll-spy can
 *  highlight it. The 7-day path sits just above the Road-of-Legends section, the
 *  first point at which it has anything to show. */
function SinglePageFlow(
  props: {
    steps: StepMeta[];
  } & Omit<Parameters<typeof StepContent>[0], "step">,
) {
  const { steps, summary, blockPlan, roadPlan, onJump } = props;
  return (
    <div className="space-y-8">
      {steps.map((meta, i) => (
        <Fragment key={meta.id}>
          {meta.id === 3 ? (
            <WeekOverview summary={summary} blockPlan={blockPlan} roadPlan={roadPlan} onJump={onJump} />
          ) : null}
          <section id={`step-${meta.id}`} data-step={meta.id} className="scroll-mt-[64px] space-y-4">
            <SectionDivider meta={meta} first={i === 0} />
            <StepContent {...props} step={meta.id} />
          </section>
        </Fragment>
      ))}
    </div>
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
  const hasGoals = summary.totalRaids.max > 0;
  // The first step blocking a real plan (no targets → step 1; targets but no
  // goal → step 2), so empty states point at the exact thing that's missing.
  const blocking = missingStep(anySelected, hasGoals);

  if (step === 1) {
    return <BossList />;
  }

  if (step === 2) {
    return (
      <section className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Enter what you have</h2>
            <button
              type="button"
              onClick={onResetAll}
              className="shrink-0 rounded-md border border-rose-500/50 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/25"
            >
              Reset all
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-400">Screenshots auto-fill, or type your totals and a goal by hand.</p>
        </div>
        {anySelected ? (
          <>
            {/* Passes / Link Charges on hand (collapsed by default) sits above the
                screenshot importer so the cost step can show have / need / buy. */}
            <ResourcesOnHand />
            {/* Screenshot upload sits near the top of the step — auto-fills the
                cards below, but is entirely optional (type by hand instead). The
                copyable search string now lives inside the bulk-import box. */}
            <BulkImportSection />

            <CardJumpNav bosses={otherSelectedBosses} mewtwoSelected={mewtwoSelected} />

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
            {/* Day-of copy-paste lists are long (dozens of species per day) and
                only matter DURING the event — collapsed so entering numbers, the
                actual job of this step, isn't buried under four screens of text.
                The Adventure Effects planner lives here too: it's day-of prep
                (what an effect costs in candy/dust before you cast it). */}
            <Disclosure
              title={
                <span className="font-semibold text-slate-200">
                  Day-of prep — counters, mega-evolves &amp; Adventure Effects
                </span>
              }
              hint={<span className="text-slate-500">copy-paste for Sat / Sun</span>}
            >
              <div className="space-y-3 py-1">
                <CounterSearchBar />
                <MegaSearchBar />
                <div className="border-t border-white/10 pt-3">
                  <h4 className="mb-2 text-sm font-semibold text-slate-200">
                    <PixelIcon name="bolt" size={12} /> Adventure Effects planner
                  </h4>
                  <AdventureEffects />
                </div>
              </div>
            </Disclosure>
          </>
        ) : blocking ? (
          <StepNudge missing={blocking} onJump={onJump} />
        ) : null}
      </section>
    );
  }

  if (step === 3) {
    return <PlanSetup roadPlan={roadPlan} />;
  }

  if (step === 4) {
    return (
      <>
        {blocking ? <StepNudge missing={blocking} onJump={onJump} /> : null}
        <SummaryDashboard summary={summary} blockPlan={blockPlan} />
      </>
    );
  }

  if (step === 5) {
    return (
      <>
        {blocking ? <StepNudge missing={blocking} onJump={onJump} /> : null}
        <RemotePrioritizer plan={blockPlan} />
      </>
    );
  }

  if (step === 6) {
    return (
      <>
        {blocking ? <StepNudge missing={blocking} onJump={onJump} /> : null}
        <ResultsStep summary={summary} blockPlan={blockPlan} roadPlan={roadPlan} />
      </>
    );
  }

  // step === 7 — Cost
  return (
    <>
      {blocking ? <StepNudge missing={blocking} onJump={onJump} /> : null}
      <CostStep summary={summary} blockPlan={blockPlan} roadPlan={roadPlan} />
    </>
  );
}

function Disclaimer() {
  return (
    <footer className="mt-10 space-y-2 border-t border-white/10 px-1 pb-8 pt-6 text-xs text-slate-500">
      <p>
        Reward amounts vary per raid, so raid counts are shown as ranges (best-case to worst-case rolls). The “with mega
        buddy” figure assumes a matching Mega-Evolved buddy is boosting your Candy/XL gains.
      </p>
      <p>
        Game values (Mega Energy rewards, Mewtwo mega-level costs, the boss roster) are based on public GO Fest 2026 info and
        may change — they live in one editable config file. This is an unofficial, fan-made planning tool and is not
        affiliated with Niantic, Nintendo, or The Pokémon Company. Pokémon and all related names and sprites are property of
        their respective owners.
      </p>
    </footer>
  );
}
