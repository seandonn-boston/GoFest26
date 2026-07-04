"use client";

import { useEffect } from "react";
import { useUiStore } from "@/store/useUiStore";

/**
 * Mirrors the "Renders" preferences (skin, density, reduce-motion) onto the
 * document root so CSS can key off them: `data-skin`, `data-density`, and the
 * `reduce-motion` class (OR'd with the OS setting). Headless. A pre-paint script
 * in layout.tsx sets the same attributes before first paint to avoid a flash.
 */
export function RenderSettings() {
  const theme = useUiStore((s) => s.theme);
  const density = useUiStore((s) => s.density);
  const reduceMotion = useUiStore((s) => s.reduceMotion);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-density", density);
  }, [theme, density]);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const apply = () => root.classList.toggle("reduce-motion", reduceMotion || (mq?.matches ?? false));
    apply();
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, [reduceMotion]);

  return null;
}
