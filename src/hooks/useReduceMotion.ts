"use client";

import { useEffect, useState } from "react";
import { useUiStore } from "@/store/useUiStore";

/**
 * The effective reduce-motion state: the user's Renders toggle OR'd with the OS
 * `prefers-reduced-motion` setting. JS-driven motion (glitch timers, confetti,
 * the gyroscope loop, single-page) reads this to stay still; CSS-driven motion
 * is handled by the `.reduce-motion` class (see RenderSettings + globals.css).
 */
export function useReduceMotion(): boolean {
  const forced = useUiStore((s) => s.reduceMotion);
  const [os, setOs] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const on = () => setOs(mq?.matches ?? false);
    on();
    mq?.addEventListener?.("change", on);
    return () => mq?.removeEventListener?.("change", on);
  }, []);

  return forced || os;
}
