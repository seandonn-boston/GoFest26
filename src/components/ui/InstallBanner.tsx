"use client";

import { useEffect, useState } from "react";
import { useAppReady } from "@/store/useAppReady";

/** A captured Android `beforeinstallprompt` event (typed loosely — it's non-standard). */
interface BipEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios-safari" | "ios-other" | "android" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (iOS) return /CriOS|FxiOS|EdgiOS/.test(ua) ? "ios-other" : "ios-safari";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari exposes this non-standard flag when launched from the Home Screen.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Slim top banner nudging users to add the app to their Home Screen — it
 * launches full-screen and keeps their plan around between sessions. On Android
 * Chrome (when the browser offers it) the button fires the native install
 * prompt; everywhere else (all iOS browsers, which can't be triggered
 * programmatically) it opens a modal with the manual steps for that browser.
 *
 * Dismissal is in-memory only — closing it hides it for this view but it
 * returns on the next page load. We never show it once the user is in the
 * installed app (launched from the Home Screen), which is the whole point.
 */
export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [deferred, setDeferred] = useState<BipEvent | null>(null);
  const [modal, setModal] = useState(false);
  // Hold off until the loading screen has fully lifted (set by SubstituteLoader)
  // so the banner doesn't flash in behind/through the veil.
  const ready = useAppReady((s) => s.ready);

  useEffect(() => {
    if (isStandalone()) return;
    const p = detectPlatform();
    setPlatform(p);
    // Only nudge on phones/tablets (the whole point is the Home Screen).
    if (p !== "other") setShow(true);

    const onBip = (e: Event) => {
      e.preventDefault(); // stash it so we can trigger the prompt on tap
      setDeferred(e as BipEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    const onInstalled = () => dismiss();
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setShow(false);
    setModal(false);
  }

  async function add() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      dismiss();
      return;
    }
    setModal(true); // iOS (and Android without a native prompt) → manual steps
  }

  if (!show || !ready) return null;

  return (
    <>
      <div className="flex items-center gap-2 border-b border-gofest-accent/30 bg-gofest-accent/10 px-3 py-2 text-[14px] text-slate-100">
        <span aria-hidden className="text-base leading-none">📲</span>
        <p className="min-w-0 flex-1 leading-tight">
          <b>Add to Home Screen</b> — launches full-screen and keeps your plan saved between sessions.
        </p>
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-sm border border-gofest-accent/60 bg-gofest-accent/20 px-2 py-1 font-mono text-[12px] font-bold uppercase tracking-wider text-gofest-accent transition hover:bg-gofest-accent/30"
        >
          Add
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 px-1 text-slate-400 hover:text-slate-200"
        >
          ✕
        </button>
      </div>

      {modal ? (
        <div
          className="fixed inset-0 z-50 flex cursor-zoom-out items-end justify-center bg-black/80 p-4 sm:items-center"
          onClick={() => setModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="How to add to Home Screen"
        >
          <div
            className="w-full max-w-md cursor-default rounded-xl border border-white/15 bg-gofest-bg p-4 text-sm text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold">Add to your Home Screen</h2>
              <button type="button" onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-200">
                ✕
              </button>
            </div>
            <p className="mb-3 text-[16px] text-slate-400">
              It launches full-screen like an app and keeps your raid plan saved between sessions.
            </p>
            <ol className="list-decimal space-y-1.5 pl-5 text-[16px] leading-relaxed">
              <Steps platform={platform} />
            </ol>
            <button
              type="button"
              onClick={dismiss}
              className="mt-4 w-full rounded-lg bg-gofest-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Steps({ platform }: { platform: Platform }) {
  if (platform === "ios-safari") {
    return (
      <>
        <li>Tap the <b>Share</b> icon (the square with an up-arrow) in the Safari toolbar.</li>
        <li>Scroll down and tap <b>Add to Home Screen</b>.</li>
        <li>Tap <b>Add</b> in the top-right.</li>
      </>
    );
  }
  if (platform === "ios-other") {
    return (
      <>
        <li>iOS only lets <b>Safari</b> add Home-Screen apps — open this page in Safari first.</li>
        <li>Then tap the <b>Share</b> icon → <b>Add to Home Screen</b> → <b>Add</b>.</li>
      </>
    );
  }
  if (platform === "android") {
    return (
      <>
        <li>Tap the <b>⋮</b> menu (top-right of Chrome).</li>
        <li>Tap <b>Add to Home screen</b> (or <b>Install app</b>).</li>
        <li>Confirm with <b>Add</b> / <b>Install</b>.</li>
      </>
    );
  }
  return (
    <>
      <li>Open your browser&apos;s menu.</li>
      <li>Choose <b>Install app</b> or <b>Add to Home Screen</b>.</li>
    </>
  );
}
