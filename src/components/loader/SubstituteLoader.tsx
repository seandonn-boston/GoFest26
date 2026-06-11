"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { warmupOcr } from "@/lib/ocrEngine";

// The WebGL battle scene is client-only; load it lazily with a quiet fallback.
const SubstituteScreen = dynamic(() => import("./SubstituteLoaderScreen"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

/**
 * Voxel Substitute loading sequence: the sculpted doll hovers over a battle
 * platform while a Gen-5 HP bar depletes inversely to load progress. At 0 HP
 * it is knocked down, bounces, and fades; the overlay then veils out and the
 * app switches in beneath.
 */
export function SubstituteLoader({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"loading" | "veil" | "app">("loading");
  const veilTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Use the loader's screen time to pull down the OCR engine (script, WASM
    // core, LSTM weights) so the first screenshot scan starts instantly.
    warmupOcr();
    return () => {
      if (veilTimer.current) clearTimeout(veilTimer.current);
    };
  }, []);

  const handleDone = useCallback(() => {
    setPhase("veil");
    veilTimer.current = setTimeout(() => setPhase("app"), 750);
  }, []);

  return (
    <>
      <div className={phase === "loading" ? "pointer-events-none invisible" : "switch-in"}>{children}</div>

      {phase !== "app" ? (
        <div
          className="fixed inset-0 z-50"
          style={{
            opacity: phase === "veil" ? 0 : 1,
            transition: "opacity 0.75s ease",
            pointerEvents: phase === "veil" ? "none" : "auto",
          }}
        >
          <SubstituteScreen onDone={handleDone} />
        </div>
      ) : null}
    </>
  );
}
