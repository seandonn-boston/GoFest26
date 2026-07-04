"use client";

import { useEffect } from "react";

/**
 * Mirrors the OS `prefers-reduced-motion` setting onto a `reduce-motion` class
 * on `<html>`, so CSS can zero animations for users who ask for that. Headless.
 */
export function RenderSettings() {
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
