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

/** Run `cb` on the browser's idle time (fallback: a short timeout). Returns a
 *  canceller. Keeps heavy prefetching off the critical first-load path. */
function runWhenIdle(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(cb, { timeout: 2500 });
    return () => w.cancelIdleCallback?.(id);
  }
  const t = setTimeout(cb, 1500);
  return () => clearTimeout(t);
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// The WebGL battle scene is client-only and the app's single heaviest chunk
// (~all of three.js); load it lazily with a quiet fallback.
const SubstituteScreen = dynamic(() => import("./SubstituteLoaderScreen"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

// Failsafe: a slow or failed loader bundle (e.g. three.js never downloads) must
// never strand the user on the loading screen — reveal the app regardless.
const SAFETY_REVEAL_MS = 8000;

/**
 * Voxel Substitute loading sequence: the sculpted doll hovers over a battle
 * platform while a Gen-5 HP bar depletes inversely to load progress. At 0 HP
 * it is knocked down, bounces, and fades; the overlay then veils out and the
 * app switches in beneath.
 *
 * Fast/robust paths: reduced-motion users skip the WebGL entirely (three.js is
 * never even downloaded); a tap skips the animation; a hard timeout reveals the
 * app if the loader bundle is slow or fails; and the OCR engine + sprite
 * prefetch run on idle so they don't compete with the first load.
 */
export function SubstituteLoader({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"loading" | "veil" | "app">("loading");
  // switch-in's keyframes leave a transform on the wrapper (fill-mode: both),
  // which would make it the containing block for every fixed-position
  // descendant (lightboxes, sheets) — strip the class once the reveal ends.
  const [revealed, setRevealed] = useState(false);
  // Computed synchronously on first (client-only) render so the WebGL screen —
  // and its three.js bundle — is never rendered/downloaded for these users.
  const [reduced] = useState(prefersReducedMotion);
  const veilTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDone = useCallback(() => {
    setPhase((p) => (p === "app" ? p : "veil"));
    if (veilTimer.current) clearTimeout(veilTimer.current);
    veilTimer.current = setTimeout(() => {
      setPhase("app");
      useAppReady.getState().setReady(); // let the install banner appear now
    }, 750);
  }, []);

  // Prefetch the OCR engine, sprites and guide images on IDLE time (after first
  // paint) rather than synchronously on mount, so they don't contend for
  // bandwidth with the critical load + the loader bundle.
  useEffect(() => runWhenIdle(() => {
    warmupOcr();
    warmSprites();
    warmGuideImages();
  }), []);

  // Reduced-motion → no WebGL; a brief static splash then reveal.
  useEffect(() => {
    if (!reduced) return;
    const t = setTimeout(handleDone, 350);
    return () => clearTimeout(t);
  }, [reduced, handleDone]);

  // Failsafe reveal (covers a slow/failed loader bundle).
  useEffect(() => {
    const t = setTimeout(handleDone, SAFETY_REVEAL_MS);
    return () => clearTimeout(t);
  }, [handleDone]);

  useEffect(() => () => {
    if (veilTimer.current) clearTimeout(veilTimer.current);
  }, []);

  // The page beneath must not scroll while the loading screen covers it.
  const overlayUp = phase !== "app";
  useEffect(() => {
    if (!overlayUp) return;
    return lockBodyScroll();
  }, [overlayUp]);

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
          onClick={phase === "loading" && !reduced ? handleDone : undefined}
        >
          {reduced ? (
            // Static (no animation) splash for reduced-motion users.
            <div className="flex h-full w-full items-center justify-center bg-gofest-bg">
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-gofest-accent2">GO FEST // 2026</span>
            </div>
          ) : (
            <>
              <SubstituteScreen onDone={handleDone} />
              {phase === "loading" ? (
                <button
                  type="button"
                  onClick={handleDone}
                  className="absolute bottom-4 right-4 z-10 rounded-full border border-white/20 bg-black/40 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-slate-300 transition hover:text-white"
                >
                  Skip ›
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
