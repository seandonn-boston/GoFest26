"use client";

import { useState } from "react";
import { isDefaultSettings } from "@/domain/settings";
import { usePlannerStore } from "@/store/usePlannerStore";
import { useTiltStore } from "@/store/useTiltStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import { AssumptionsControls } from "./AssumptionsControls";
import { LocationControls } from "./LocationControls";
import { FeedbackForm } from "./FeedbackForm";

type Panel = "assumptions" | "location" | "feedback";

interface DialItem {
  id: string;
  label: string;
  icon: string;
  circle: string;
  onClick: () => void;
  badge?: boolean;
}

const TITLES: Record<Panel, string> = {
  assumptions: "⚙ Assumptions",
  location: "📍 Your location",
  feedback: "✎ Feedback",
};

const miniFab =
  "flex h-12 w-12 items-center justify-center rounded-full border-2 border-black/40 text-xl shadow-brutal transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none";

/**
 * Bottom-right FAB speed-dial: a single + button that fans out into Assumptions,
 * Location and Feedback. Each opens a bottom sheet; assumption/location edits
 * recompute the plan live, feedback pipes to GitHub Issues.
 */
export function ActionDock() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const customized = !isDefaultSettings(usePlannerStore((s) => s.settings));
  const isMobile = useIsMobile();
  const tiltSupported = useTiltStore((s) => s.supported);
  const tiltEnabled = useTiltStore((s) => s.enabled);
  const requestTilt = useTiltStore((s) => s.request);

  const openPanel = (id: Panel) => {
    setPanel(id);
    setOpen(false);
  };

  // Rendered top → bottom; the last sits nearest the main FAB. The motion-tilt
  // opt-in only makes sense on a phone/tablet with a real orientation sensor.
  const items: DialItem[] = [];
  if (isMobile && tiltSupported) {
    items.push({
      id: "tilt",
      label: tiltEnabled ? "Tilt on" : "Enable tilt",
      icon: "🧭",
      circle: "bg-amber-300 text-black",
      onClick: () => {
        requestTilt();
        setOpen(false);
      },
    });
  }
  items.push(
    { id: "feedback", label: "Feedback", icon: "✎", circle: "bg-gofest-accent text-black", onClick: () => openPanel("feedback") },
    { id: "location", label: "Location", icon: "📍", circle: "bg-gofest-accent2 text-black", onClick: () => openPanel("location") },
    { id: "assumptions", label: "Assumptions", icon: "⚙", circle: "bg-gofest-mewtwo text-white", onClick: () => openPanel("assumptions"), badge: customized },
  );

  return (
    <>
      {/* Speed-dial scrim */}
      {open ? <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" /> : null}

      {/* FAB + speed-dial (hidden while a sheet is open) */}
      {panel === null ? (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
          {items.map((a, i) => (
            <div
              key={a.id}
              className={`flex items-center gap-2.5 transition-all duration-200 ${
                open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
              }`}
              style={{ transitionDelay: `${open ? (items.length - 1 - i) * 40 : 0}ms` }}
            >
              <span className="rounded-md bg-gofest-bone px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-black shadow">
                {a.label}
              </span>
              <button type="button" onClick={a.onClick} className={`relative ${miniFab} ${a.circle}`}>
                {a.icon}
                {a.badge ? (
                  <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-black bg-gofest-accent" />
                ) : null}
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-black/40 bg-gofest-acid text-black shadow-brutal transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <span className={`text-4xl font-light leading-none transition-transform duration-200 ${open ? "rotate-45" : ""}`}>
              +
            </span>
          </button>
        </div>
      ) : null}

      {/* Bottom sheet */}
      {panel !== null ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            onClick={() => setPanel(null)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-3xl rounded-t-2xl border-2 border-b-0 border-white/15 bg-gofest-panel shadow-brutal">
            <div className="flex items-center justify-between border-b-2 border-white/10 px-4 py-3">
              <h2 className="font-mono text-sm font-extrabold uppercase tracking-widest text-gofest-acid">
                {TITLES[panel]}
              </h2>
              <button
                type="button"
                onClick={() => setPanel(null)}
                aria-label="Close"
                className="rounded-sm border border-white/15 bg-white/5 px-2 py-1 text-slate-300 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[72vh] overflow-y-auto px-4 py-4">
              {panel === "assumptions" ? <AssumptionsControls /> : null}
              {panel === "location" ? <LocationControls /> : null}
              {panel === "feedback" ? <FeedbackForm onDone={() => setPanel(null)} /> : null}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
