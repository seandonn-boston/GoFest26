"use client";

import type { ReactNode } from "react";
import type { StepId } from "@/store/useUiStore";

const STEP_LABELS: Record<StepId, string> = {
  1: "Pick targets",
  2: "Enter what you have",
  3: "Prioritize",
  4: "Results",
  5: "Cost",
};

export interface MissingStep {
  step: StepId;
  title: string;
  message: ReactNode;
}

/**
 * Work out the first thing standing between the user and a real plan, so we can
 * point them at the *exact* step that's missing rather than a generic "nothing
 * here yet". Ordered by the flow: you need a target before numbers can matter,
 * and numbers before there are any raids to count.
 */
export function missingStep(anySelected: boolean, hasGoals: boolean): MissingStep | null {
  if (!anySelected) {
    return {
      step: 1,
      title: "Pick a target to get started",
      message: (
        <>
          Choose at least one Pokémon you want to power up — the Mega Mewtwo X &amp; Y tiles are a
          great place to start.
        </>
      ),
    };
  }
  if (!hasGoals) {
    return {
      step: 2,
      title: "Set a goal to see your raid counts",
      message: (
        <>
          Your targets don&apos;t need any raids yet. In <b>Enter what you have</b>, set a level or Mega
          Level higher than what you already have.
        </>
      ),
    };
  }
  return null;
}

/**
 * A friendly pointer that sends the user straight to the step that's blocking
 * progress. Used for the empty states on the import / numbers steps and at the
 * top of the results step when there's nothing to compute yet.
 */
export function StepNudge({ missing, onJump }: { missing: MissingStep; onJump: (id: StepId) => void }) {
  return (
    <div className="rounded-lg border border-gofest-accent2/30 bg-gofest-accent2/[0.06] p-4">
      <p className="text-sm font-semibold text-slate-100">{missing.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-300">{missing.message}</p>
      <button
        type="button"
        onClick={() => onJump(missing.step)}
        className="mt-2.5 inline-flex items-center gap-1.5 rounded-md bg-gofest-accent2 px-3 py-1.5 text-xs font-semibold text-black shadow-brutal transition hover:brightness-110"
      >
        Go to step {missing.step}: {STEP_LABELS[missing.step]} →
      </button>
    </div>
  );
}
