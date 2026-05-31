"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { MISSINGNO_VOXELS, SUBSTITUTE_VOXELS } from "./voxelData";
import { decodeMissingnoVoxels } from "./missingnoImage";

// The WebGL canvas is client-only; load it lazily with a quiet fallback.
const LoaderCanvas = dynamic(() => import("./LoaderCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

/**
 * Plays a voxel "Substitute" loading sequence: the doll floats while its voxel
 * HP bar depletes, then it faints and the real content switches in (Pokémon
 * mainline style). 1 in 10 loads show MissingNo instead.
 */
export function SubstituteLoader({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(false);
  const [isGlitch] = useState(() => Math.random() < 0.1);
  // For the glitch, decode the real MissingNo sprite in the browser; fall back
  // to the bundled transcription if the fetch/CORS is blocked.
  const [missingno, setMissingno] = useState(MISSINGNO_VOXELS);
  useEffect(() => {
    if (!isGlitch) return;
    let active = true;
    decodeMissingnoVoxels().then((v) => {
      if (active && v) setMissingno(v);
    });
    return () => {
      active = false;
    };
  }, [isGlitch]);

  const voxels = isGlitch ? missingno : SUBSTITUTE_VOXELS;

  return (
    <>
      <div className={done ? "switch-in" : "pointer-events-none invisible"}>{children}</div>

      {!done ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gofest-bg">
          <div className="aspect-square w-full max-w-sm">
            <LoaderCanvas voxels={voxels} onComplete={() => setDone(true)} />
          </div>
          <div className="-mt-2 text-center">
            <div
              className={
                isGlitch
                  ? "glitch-text text-lg font-bold tracking-[0.3em] text-fuchsia-300"
                  : "text-sm font-semibold tracking-[0.3em] text-slate-200"
              }
            >
              {isGlitch ? "MISSINGNO" : "SUBSTITUTE"}
            </div>
            <div className="mt-1 text-xs text-slate-400">Loading your plan…</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
