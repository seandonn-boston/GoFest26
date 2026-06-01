"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Coordinates a shared scale across every tile sprite so they grow at the *same
 * ratio*: each sprite reports its intrinsic max dimension, and the largest one
 * defines 100%. `relativeFor(src)` returns that sprite's size relative to the
 * largest (0..1), which the tile turns into a percentage of the tile box.
 */
interface SpriteScale {
  register: (src: string, dim: number) => void;
  relativeFor: (src: string) => number;
}

const SpriteScaleContext = createContext<SpriteScale | null>(null);

export function SpriteScaleProvider({ children }: { children: ReactNode }) {
  const [dims, setDims] = useState<Record<string, number>>({});

  const register = useCallback((src: string, dim: number) => {
    setDims((prev) => (prev[src] === dim ? prev : { ...prev, [src]: dim }));
  }, []);

  const globalMax = useMemo(() => {
    const vals = Object.values(dims);
    return vals.length ? Math.max(...vals) : 0;
  }, [dims]);

  const relativeFor = useCallback(
    (src: string) => {
      const d = dims[src];
      if (!globalMax || !d) return 1; // until measured, render at full size
      return d / globalMax;
    },
    [dims, globalMax],
  );

  const value = useMemo<SpriteScale>(() => ({ register, relativeFor }), [register, relativeFor]);

  return <SpriteScaleContext.Provider value={value}>{children}</SpriteScaleContext.Provider>;
}

export function useSpriteScale(): SpriteScale | null {
  return useContext(SpriteScaleContext);
}
