"use client";

import { useEffect, useState } from "react";

const COLORS = ["#d9f99d", "#a3e635", "#facc15", "#fbbf24", "#f472b6", "#38bdf8", "#c4b5fd"];

interface Bit {
  left: number;
  delay: number;
  dur: number;
  rot: number;
  drift: number;
  color: string;
  w: number;
  h: number;
}

/**
 * A one-shot, dependency-free confetti burst. Renders a fixed-position overlay of
 * falling/spinning pieces for ~2.4s, then unmounts itself. `fire` gates it (only
 * bursts while true); `replayKey` re-triggers it when its value changes. Respects
 * prefers-reduced-motion by rendering nothing. Randomization happens inside the
 * effect (never during render) so it stays pure.
 */
export function Confetti({ fire, replayKey = 0, pieces = 90 }: { fire: boolean; replayKey?: number; pieces?: number }) {
  const [bits, setBits] = useState<Bit[] | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    if (!fire || reduced) return;
    setBits(
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        dur: 1.6 + Math.random() * 0.9,
        rot: Math.random() * 360 + 540,
        drift: (Math.random() - 0.5) * 140,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 6,
        h: 9 + Math.random() * 8,
      })),
    );
    const t = setTimeout(() => setBits(null), 2400);
    return () => clearTimeout(t);
  }, [fire, replayKey, pieces]);

  if (!bits) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
      <style>{`@keyframes gofest-confetti-fall{0%{transform:translate3d(0,-10vh,0) rotate(0);opacity:1}100%{transform:translate3d(var(--dx),110vh,0) rotate(var(--r));opacity:.9}}`}</style>
      {bits.map((b, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: "-8vh",
            left: `${b.left}%`,
            width: b.w,
            height: b.h,
            background: b.color,
            borderRadius: 2,
            ["--dx" as string]: `${b.drift}px`,
            ["--r" as string]: `${b.rot}deg`,
            animation: `gofest-confetti-fall ${b.dur}s cubic-bezier(0.25,0.6,0.4,1) ${b.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
