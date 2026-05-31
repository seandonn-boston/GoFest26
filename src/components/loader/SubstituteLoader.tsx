"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { MISSINGNO_VOXELS } from "./voxelData";
import { decodeMissingnoVoxels } from "./missingnoImage";

// The WebGL canvas is client-only; load it lazily with a quiet fallback.
const LoaderCanvas = dynamic(() => import("./LoaderCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

/**
 * Voxel MissingNo loading sequence: the glitch sprite floats while its voxel HP
 * bar depletes, then it faints and the app switches in. The real MissingNo
 * sprite is decoded in the browser when possible; otherwise the bundled
 * transcription is used.
 */
export function SubstituteLoader({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(false);
  const [voxels, setVoxels] = useState(MISSINGNO_VOXELS);

  useEffect(() => {
    let active = true;
    decodeMissingnoVoxels().then((v) => {
      if (active && v) setVoxels(v);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <div className={done ? "switch-in" : "pointer-events-none invisible"}>{children}</div>

      {!done ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gofest-bg">
          <div className="aspect-square w-full max-w-sm">
            <LoaderCanvas voxels={voxels} onComplete={() => setDone(true)} />
          </div>
          <div className="-mt-2 text-center">
            <div className="glitch-text text-lg font-bold tracking-[0.3em] text-fuchsia-300">MISSINGNO</div>
            <div className="mt-1 text-xs text-slate-400">Loading your plan…</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
