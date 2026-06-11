"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import { useLoadingScreen } from "@/store/useLoadingScreen";

// The WebGL battle scene is client-only; load it lazily with a quiet fallback.
const SubstituteScreen = dynamic(() => import("./SubstituteLoaderScreen"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

/**
 * The Substitute loading screen as an in-app overlay: obscures the planner
 * while work driven through useLoadingScreen (screenshot scanning, etc.) runs,
 * then plays the KO + fade and veils out.
 */
export function LoadingScreenOverlay() {
  const active = useLoadingScreen((s) => s.active);
  const progress = useLoadingScreen((s) => s.progress);
  const runId = useLoadingScreen((s) => s.runId);
  const dismiss = useLoadingScreen((s) => s.dismiss);
  // Veiling is tracked outside React state: the overlay element fades via its
  // own style transition, then dismiss() unmounts it through the store.
  const veilRef = useRef<HTMLDivElement>(null);
  const veilTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // A new run can begin while the previous fade-out is still pending —
    // cancel the dismissal and restore the veil for the fresh sequence.
    if (veilTimer.current) {
      clearTimeout(veilTimer.current);
      veilTimer.current = null;
    }
    const el = veilRef.current;
    if (el) {
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
    }
  }, [runId]);

  useEffect(() => {
    return () => {
      if (veilTimer.current) clearTimeout(veilTimer.current);
    };
  }, []);

  const handleDone = useCallback(() => {
    const el = veilRef.current;
    if (el) {
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
    }
    veilTimer.current = setTimeout(dismiss, 750);
  }, [dismiss]);

  if (!active) return null;

  return (
    <div
      ref={veilRef}
      className="fixed inset-0 z-50"
      style={{ opacity: 1, transition: "opacity 0.75s ease" }}
    >
      <SubstituteScreen key={runId} progress={progress} onDone={handleDone} />
    </div>
  );
}
