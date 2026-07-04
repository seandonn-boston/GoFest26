"use client";

import { useEffect } from "react";
import { useUiStore } from "@/store/useUiStore";

/**
 * Mirrors the chosen theme onto `<html data-theme>` and the OS
 * `prefers-reduced-motion` setting onto the `reduce-motion` class, so CSS can
 * key off both. A pre-paint script in layout.tsx applies the theme before first
 * paint to avoid a flash. Headless.
 */
export function RenderSettings() {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const apply = () => root.classList.toggle("reduce-motion", mq?.matches ?? false);
    apply();
    mq?.addEventListener?.("change", apply);
    return () => mq?.removeEventListener?.("change", apply);
  }, []);

  return null;
}
