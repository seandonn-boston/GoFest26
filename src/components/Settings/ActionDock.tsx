"use client";

import { useCallback, useState } from "react";
import { isDefaultSettings } from "@/domain/settings";
import { usePlannerStore } from "@/store/usePlannerStore";
import { useUiStore } from "@/store/useUiStore";
import { useAppReady } from "@/store/useAppReady";
import { useDialog } from "@/hooks/useDialog";
import { AssumptionsControls } from "./AssumptionsControls";
import { LocationControls } from "./LocationControls";
import { FeedbackForm } from "./FeedbackForm";
import { BackupControls } from "./BackupControls";
import { PixelIcon, type PixelIconName } from "@/components/ui/PixelIcon";
import { useTiltStore } from "@/store/useTiltStore";
import { useIsMobile } from "@/hooks/useIsMobile";

type Panel = "assumptions" | "location" | "feedback" | "backup";

interface DialItem {
  id: string;
  label: string;
  icon: PixelIconName;
  /** Accent (hex) that tints this control's glass edge, icon and label bar via
   *  the `--accent` custom property. */
  accent: string;
  onClick: () => void;
  badge?: boolean;
}

const TITLES: Record<Panel, { icon: PixelIconName; label: string }> = {
  assumptions: { icon: "gear", label: "Assumptions" },
  location: { icon: "pin", label: "Your location" },
  feedback: { icon: "pencil", label: "Feedback" },
  backup: { icon: "floppy", label: "Backup & restore" },
};

const miniFab = "glass-fab flex h-12 w-12 items-center justify-center rounded-full text-xl";

/**
 * Bottom-right FAB speed-dial: a single + button that fans out into Assumptions,
 * Location and Feedback. Each opens a bottom sheet; assumption/location edits
 * recompute the plan live, feedback pipes to GitHub Issues.
 */
export function ActionDock() {
  const fabSide = useUiStore((s) => s.fabSide);
  const toggleFabSide = useUiStore((s) => s.toggleFabSide);
  const open = useUiStore((s) => s.fabOpen);
  const setFabOpen = useUiStore((s) => s.setFabOpen);
  const setOpen = useCallback(
    (v: boolean | ((o: boolean) => boolean)) => setFabOpen(typeof v === "function" ? v(useUiStore.getState().fabOpen) : v),
    [setFabOpen],
  );
  const isRight = fabSide === "right";
  const [panel, setPanel] = useState<Panel | null>(null);
  const customized = !isDefaultSettings(usePlannerStore((s) => s.settings));
  const isMobile = useIsMobile();
  const tiltSupported = useTiltStore((s) => s.supported);
  const tiltEnabled = useTiltStore((s) => s.enabled);
  const requestTilt = useTiltStore((s) => s.request);
  const setTiltEnabled = useTiltStore((s) => s.setEnabled);

  const openPanel = (id: Panel) => {
    setPanel(id);
    setOpen(false);
  };

  // Nuke everything this app has persisted on the device — the whole localStorage
  // JSON (every store), sessionStorage, IndexedDB, the service-worker caches and
  // registration, cookies — then reload fresh so nothing cached is served. One
  // confirm guards it since it's irreversible.
  const hardReset = async () => {
    if (
      !window.confirm(
        "HARD RESET\n\nThis permanently erases EVERYTHING saved on this device — your entire plan, every setting, and all cached app data — then reloads the app fresh.\n\nThis cannot be undone. Continue?",
      )
    ) {
      return;
    }
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    try {
      if (indexedDB.databases) {
        const dbs = await indexedDB.databases();
        await Promise.all(dbs.map((d) => (d.name ? indexedDB.deleteDatabase(d.name) : undefined)));
      }
    } catch {}
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch {}
    try {
      for (const c of document.cookie.split(";")) {
        const name = c.split("=")[0].trim();
        if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    } catch {}
    // Reload to the bare path (drops any shared-plan query) with a cache-buster so
    // the document itself isn't served from the HTTP cache.
    const fresh = `${window.location.pathname}?_r=${Date.now()}`;
    window.location.replace(fresh);
  };
  const closePanel = useCallback(() => setPanel(null), []);
  const sheetRef = useDialog<HTMLDivElement>(panel !== null, closePanel);

  // Stay hidden until the Substitute loading screen has fully lifted — the FAB
  // must not float over the loader.
  const appReady = useAppReady((s) => s.ready);
  if (!appReady) return null;

  // Rendered top → bottom; the last sits nearest the main FAB.
  const items: DialItem[] = [];
  // Gyroscope tilt — a direct on/off toggle (phones/tablets with a sensor only).
  if (isMobile && tiltSupported) {
    items.push({
      id: "tilt",
      label: tiltEnabled ? "Tilt · on" : "Tilt",
      icon: "phone",
      accent: "#8ba3c7",
      badge: tiltEnabled,
      onClick: () => {
        if (tiltEnabled) setTiltEnabled(false);
        else requestTilt();
        setOpen(false);
      },
    });
  }
  items.push(
    {
      id: "feedback",
      label: "Feedback",
      icon: "pencil",
      accent: "#ff2bd6",
      onClick: () => openPanel("feedback"),
    },
    { id: "backup", label: "Backup", icon: "floppy", accent: "#f4f1ea", onClick: () => openPanel("backup") },
    {
      id: "location",
      label: "Location",
      icon: "pin",
      accent: "#00f0ff",
      onClick: () => openPanel("location"),
    },
    {
      id: "assumptions",
      label: "Assumptions",
      icon: "gear",
      accent: "#b026ff",
      onClick: () => openPanel("assumptions"),
      badge: customized,
    },
  );

  return (
    <>
      {/* Speed-dial scrim */}
      {open ? <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" /> : null}

      {/* FAB + speed-dial (hidden while a sheet is open). The container is
          click-through (pointer-events-none): it reserves the open menu's
          vertical space even while collapsed (items stay mounted for the exit
          animation), so it must not capture taps over the tiles behind it —
          only its buttons re-enable pointer events. */}
      {panel === null ? (
        <div
          className={`pointer-events-none fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 flex flex-col gap-3 ${
            isRight ? "right-4 items-end" : "left-4 items-start"
          }`}
        >
          {items.map((a, i) => (
            <div
              key={a.id}
              className={`flex items-center gap-2.5 transition-all duration-200 ${isRight ? "" : "flex-row-reverse"} ${
                open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
              }`}
              style={{ transitionDelay: `${open ? (items.length - 1 - i) * 40 : 0}ms` }}
            >
              <span
                className="glass-label rounded-md px-2.5 py-1 font-mono text-[12px] font-bold uppercase tracking-[0.15em]"
                style={{ ["--accent" as string]: a.accent }}
              >
                {a.label}
              </span>
              <button
                type="button"
                onClick={a.onClick}
                aria-label={a.label}
                className={`relative ${miniFab}`}
                style={{ ["--accent" as string]: a.accent }}
              >
                <PixelIcon name={a.icon} size={20} />
                {a.badge ? (
                  <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border border-white/40 bg-gofest-accent shadow-[0_0_8px_#ff2bd6]" />
                ) : null}
              </button>
            </div>
          ))}

          {/* Bottom row: the main FAB, with Hard reset fanning out to the side
              opposite the page edge (horizontal, not stacked with the items above). */}
          <div className={`flex items-center gap-2.5 ${isRight ? "" : "flex-row-reverse"}`}>
            <div
              className={`flex items-center gap-2.5 transition-all duration-200 ${isRight ? "" : "flex-row-reverse"} ${
                open
                  ? "pointer-events-auto translate-x-0 opacity-100"
                  : `pointer-events-none opacity-0 ${isRight ? "translate-x-4" : "-translate-x-4"}`
              }`}
            >
              <span
                className="glass-label rounded-md px-2.5 py-1 font-mono text-[12px] font-bold uppercase tracking-[0.15em]"
                style={{ ["--accent" as string]: "#fb4268" }}
              >
                Hard reset
              </span>
              <button
                type="button"
                onClick={hardReset}
                aria-label="Hard reset — erase everything saved on this device and reload"
                className={miniFab}
                style={{ ["--accent" as string]: "#fb4268" }}
              >
                ⨯
              </button>
            </div>

            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="glass-fab glass-fab-primary pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full"
            >
              {/* Two-line hamburger → X. Each line spins 225° (top left, bottom
                right) while sliding to the exact vertical center; closing
                plays the same transition in reverse. */}
              <span className="relative block h-6 w-6" aria-hidden="true">
                <span
                  className="absolute left-1/2 top-1/2 block rounded-full bg-current"
                  style={{
                    width: 22,
                    height: 2.5,
                    transform: `translate(-50%, -50%) translateY(${open ? 0 : -4}px) rotate(${open ? -225 : 0}deg)`,
                    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
                <span
                  className="absolute left-1/2 top-1/2 block rounded-full bg-current"
                  style={{
                    width: 22,
                    height: 2.5,
                    transform: `translate(-50%, -50%) translateY(${open ? 0 : 4}px) rotate(${open ? 225 : 0}deg)`,
                    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Switch-side button — while the dial is open, a translucent ghost FAB
          appears in the SAME vertical slot on the OPPOSITE edge. Tapping it
          flips the whole dock to that side (and closes the dial), so a
          left-hander can move the whole experience under their thumb. */}
      {panel === null && open ? (
        <button
          type="button"
          onClick={() => {
            toggleFabSide();
            setOpen(false);
          }}
          aria-label={isRight ? "Move controls to the left side" : "Move controls to the right side"}
          title={isRight ? "Switch to a left-handed layout" : "Switch to a right-handed layout"}
          style={{ ["--accent" as string]: "#c6ff00", opacity: 0.62 }}
          className={`glass-fab pointer-events-auto fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
            isRight ? "left-4" : "right-4"
          }`}
        >
          {isRight ? "⟵" : "⟶"}
        </button>
      ) : null}

      {/* Bottom sheet */}
      {panel !== null ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            onClick={() => setPanel(null)}
            aria-hidden="true"
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-dock-title"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-3xl rounded-t-2xl border-2 border-b-0 border-white/15 bg-gofest-panel shadow-brutal"
          >
            <div className="flex items-center justify-between border-b-2 border-white/10 px-4 py-3">
              <h2
                id="action-dock-title"
                className="font-mono text-sm font-extrabold uppercase tracking-widest text-gofest-acid"
              >
                <PixelIcon name={TITLES[panel].icon} size={14} className="mr-1.5" />
                {TITLES[panel].label}
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
              {panel === "backup" ? <BackupControls /> : null}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
