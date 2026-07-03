"use client";

import { useEffect } from "react";
import { useUiStore } from "@/store/useUiStore";

/**
 * A single-tap sun / moon toggle (fixed bottom-left, opposite the action dock)
 * that flips between the neon `night` look and a higher-contrast `sun` mode for
 * reading outdoors. The effect mirrors the chosen theme onto <html data-theme>,
 * which the `:root[data-theme="sun"]` rules in globals.css key off. A tiny inline
 * script in layout.tsx sets the same attribute before first paint (no flash).
 */
export function ThemeToggle() {
  const theme = useUiStore((s) => s.theme);
  const toggle = useUiStore((s) => s.toggleTheme);
  const sun = theme === "sun";

  useEffect(() => {
    const root = document.documentElement;
    if (sun) root.setAttribute("data-theme", "sun");
    else root.removeAttribute("data-theme");
  }, [sun]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={sun}
      aria-label={sun ? "Switch to night theme" : "Switch to sunlight (high-contrast) theme"}
      title={sun ? "Sunlight mode on — tap for the night theme" : "Hard to read in sun? Tap for high-contrast sunlight mode"}
      className={`fixed bottom-4 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border-2 border-black/40 text-xl shadow-brutal transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
        sun ? "bg-amber-300 text-black" : "bg-slate-800 text-amber-200"
      }`}
    >
      {sun ? "☀️" : "🌙"}
    </button>
  );
}
