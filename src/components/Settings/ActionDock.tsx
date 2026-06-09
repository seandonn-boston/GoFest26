"use client";

import { useState } from "react";
import { isDefaultSettings } from "@/domain/settings";
import { usePlannerStore } from "@/store/usePlannerStore";
import { AssumptionsControls } from "./AssumptionsControls";
import { FeedbackForm } from "./FeedbackForm";

type Panel = "none" | "assumptions" | "feedback";

/**
 * Bottom-right floating action dock: quick access to planning Assumptions
 * (opens the controls as a bottom sheet — edits recompute live) and Feedback
 * (pipes to GitHub Issues).
 */
export function ActionDock() {
  const [panel, setPanel] = useState<Panel>("none");
  const customized = !isDefaultSettings(usePlannerStore((s) => s.settings));
  const close = () => setPanel("none");

  const fab =
    "flex items-center gap-1.5 rounded-xl border-2 border-black/40 px-3 py-2 font-mono text-xs font-extrabold uppercase tracking-wider text-black shadow-brutal transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none";

  return (
    <>
      {panel === "none" ? (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
          <button type="button" onClick={() => setPanel("feedback")} className={`${fab} bg-gofest-accent2`}>
            ✎ Feedback
          </button>
          <button
            type="button"
            onClick={() => setPanel("assumptions")}
            className={`${fab} relative bg-gofest-acid`}
          >
            ⚙ Assumptions
            {customized ? (
              <span className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rounded-full border-2 border-black bg-gofest-accent" />
            ) : null}
          </button>
        </div>
      ) : null}

      {panel !== "none" ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" onClick={close} aria-hidden="true" />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-3xl rounded-t-2xl border-2 border-b-0 border-white/15 bg-gofest-panel shadow-brutal">
            <div className="flex items-center justify-between border-b-2 border-white/10 px-4 py-3">
              <h2 className="font-mono text-sm font-extrabold uppercase tracking-widest text-gofest-acid">
                {panel === "assumptions" ? "⚙ Assumptions" : "✎ Feedback"}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="rounded-sm border border-white/15 bg-white/5 px-2 py-1 text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[72vh] overflow-y-auto px-4 py-4">
              {panel === "assumptions" ? <AssumptionsControls /> : <FeedbackForm onDone={close} />}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
