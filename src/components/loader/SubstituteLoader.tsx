"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { warmupOcr } from "@/lib/ocrEngine";
import { allSpriteUrls } from "@/data/pokemonSprites";
import { assetPath, GUIDE_IMAGES } from "@/lib/asset";
import { lockBodyScroll } from "@/lib/scrollLock";
import { useAppReady } from "@/store/useAppReady";

/** Warm the browser cache with every Pokémon icon so search-string sprites and
 *  cards render instantly (and broken hotlinks surface their fallback) once the
 *  loading screen lifts. Best-effort — failures are silent. */
function warmSprites() {
  if (typeof window === "undefined") return;
  for (const url of allSpriteUrls()) {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}

/** Front-load the importer's two example screenshots so the "Which screenshots?"
 *  guide renders instantly when opened. Best-effort. */
function warmGuideImages() {
  if (typeof window === "undefined") return;
  for (const path of Object.values(GUIDE_IMAGES)) {
    const img = new Image();
    img.decoding = "async";
    img.src = assetPath(path);
  }
}

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
  // switch-in's keyframes leave a transform on the wrapper (fill-mode: both),
  // which would make it the containing block for every fixed-position
  // descendant (lightboxes, sheets) — strip the class once the reveal ends.
  const [revealed, setRevealed] = useState(false);
  const veilTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Use the loader's screen time to pull down the OCR engine (script, WASM
    // core, LSTM weights) so the first screenshot scan starts instantly, and to
    // warm every Pokémon sprite the plan will reference.
    warmupOcr();
    warmSprites();
    warmGuideImages();
    return () => {
      if (veilTimer.current) clearTimeout(veilTimer.current);
    };
  }, []);

  // The page beneath must not scroll while the loading screen covers it.
  const overlayUp = phase !== "app";
  useEffect(() => {
    if (!overlayUp) return;
    return lockBodyScroll();
  }, [overlayUp]);

  const handleDone = useCallback(() => {
    setPhase("veil");
    veilTimer.current = setTimeout(() => {
      setPhase("app");
      useAppReady.getState().setReady(); // let the install banner appear now
    }, 750);
  }, []);

  return (
    <>
      <div
        className={phase === "loading" ? "pointer-events-none invisible" : revealed ? undefined : "switch-in"}
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setRevealed(true);
        }}
      >
        {children}
      </div>

      {overlayUp ? (
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
