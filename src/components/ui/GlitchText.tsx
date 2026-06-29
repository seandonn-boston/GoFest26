"use client";

import { createElement, Fragment, useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";

interface GlitchTextProps {
  /** The title text. A "\n" becomes a line break. */
  text: string;
  /** Element to render (default "span"). */
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** UPPERCASE word → extra className, to tint one word (e.g. the masthead RAID). */
  colorWords?: Record<string, string>;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]): T | undefined => arr[Math.floor(Math.random() * arr.length)];

/**
 * A cyberpunk glitch title. Unlike a shared CSS animation (which fires every
 * title in lock-step), each GlitchText runs its own timer and glitches at random
 * intervals, each time randomly targeting a single LETTER, a WORD, or the WHOLE
 * title. A glitch is a quick chromatic jitter plus a font flicker to a robotic
 * mono (CSS `.glitching`); between glitches the resting font/look is unchanged.
 * Honors prefers-reduced-motion (stays static) and keeps the text readable to
 * screen readers via an aria-label (the split letter spans are aria-hidden).
 */
export function GlitchText({ text, as = "span", className = "", style, colorWords }: GlitchTextProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let timer: number | undefined;

    const glitchOnce = (el: HTMLElement) => {
      if (el.classList.contains("glitching")) return;
      el.style.setProperty("--glitch-dur", `${Math.round(rand(260, 700))}ms`);
      const done = () => {
        el.classList.remove("glitching");
        el.removeEventListener("animationend", done);
      };
      el.addEventListener("animationend", done);
      el.classList.add("glitching");
      window.setTimeout(done, 850); // safety net if animationend is missed
    };

    const fire = () => {
      const letters = Array.from(root.querySelectorAll<HTMLElement>(".glitch-letter"));
      const words = Array.from(root.querySelectorAll<HTMLElement>(".glitch-word"));
      const roll = Math.random();
      let target: HTMLElement | undefined;
      if (roll < 0.55) target = pick(letters); // a single letter
      else if (roll < 0.85 && words.length > 1) target = pick(words); // a whole word
      else target = root; // the whole title
      if (target) glitchOnce(target);
      timer = window.setTimeout(fire, rand(1400, 5600));
    };

    // Stagger the first fire so many cards on screen never glitch in unison.
    timer = window.setTimeout(fire, rand(400, 3200));
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [text]);

  const content: ReactNode[] = text.split("\n").map((line, li) => {
    const words = line.split(" ");
    return (
      <span key={li} aria-hidden="true">
        {li > 0 ? <br /> : null}
        {words.map((word, wi) => (
          <Fragment key={wi}>
            <span className={`glitch-word ${colorWords?.[word.toUpperCase()] ?? ""}`.trim()}>
              {Array.from(word).map((ch, ci) => (
                <span key={ci} className="glitch-letter">
                  {ch}
                </span>
              ))}
            </span>
            {wi < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    );
  });

  return createElement(as, { ref, className, style, "aria-label": text.replace(/\n/g, " ") }, content);
}
