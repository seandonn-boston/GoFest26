"use client";

import { useEffect, useRef, useState } from "react";

type DOEWithPermission = typeof window.DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied" | "default">;
};

/**
 * Drives the enamel badge tilt from the phone's gyroscope: device orientation
 * updates CSS variables --tilt-x / --tilt-y (-1..1) on the document, which the
 * .badge transform reads, so the pins physically tilt as you move the phone.
 *
 * iOS (Safari 13+) gates the motion sensor behind a permission prompt that can
 * only be requested from a user gesture, and only when "Motion & Orientation
 * Access" is enabled in Settings. We try on the first tap, and also render an
 * explicit "Enable motion tilt" button so there's always a clear way in.
 */
export function TiltProvider() {
  const [needsPermission, setNeedsPermission] = useState(false);
  const requestRef = useRef<() => void>(() => {});

  useEffect(() => {
    // Respect the OS "reduce motion" setting: pin the tilt flat and run nothing.
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.style.setProperty("--tilt-x", "0");
      document.documentElement.style.setProperty("--tilt-y", "0");
      return;
    }
    // Latest device orientation offset from "held vertical" (gamma, beta-90).
    let oriX = 0;
    let oriY = 0;
    // Slow baseline that absorbs the *held* angle, so a static tilt decays away
    // (high-pass): the card only reacts to motion, then gravitates back to flat.
    let baseX = 0;
    let baseY = 0;
    // Card position + velocity, driven by a soft, lightly-damped spring so it
    // eases in slowly and springs elastically back to neutral.
    let curX = 0;
    let curY = 0;
    let velX = 0;
    let velY = 0;
    // Scroll velocity also drives the (Y) tilt — fast scrolling agitates the
    // cards; this gives desktop the effect without a gyroscope.
    let lastScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    let scrollVel = 0;
    let raf = 0;
    let gyroOn = false;
    const root = document.documentElement;
    // Last values written to the DOM — skip the setProperty when unchanged so a
    // resting card stops touching the DOM every frame (battery on mobile).
    let lastX = "";
    let lastY = "";

    const BASE_FOLLOW = 0.02; // how fast a held tilt decays back to flat (~1s)
    const DEADZONE = 0.12; // firmer nudge required before any motion begins
    const SPRING = 0.085; // soft spring => sluggish, but a touch more responsive
    const DAMP = 0.86; // <1 leaves a little elastic overshoot on the way back
    const SCROLL_SCALE = 42; // px/frame of scroll that maps to full tilt
    const SCROLL_SMOOTH = 0.4;

    const dz = (v: number) => (v > DEADZONE ? v - DEADZONE : v < -DEADZONE ? v + DEADZONE : 0);
    const clampOri = (v: number) => Math.max(-2, Math.min(2, v));
    const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

    const onOrient = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0; // left-right, ~ -90..90 (0 held vertically)
      const beta = e.beta ?? 0; // front-back, ~ 90 when held perfectly vertical
      // Origin = phone held vertically (beta ≈ 90, gamma ≈ 0). ~16° saturates.
      oriX = clampOri(gamma / 16);
      oriY = clampOri((beta - 90) / 16);
    };

    const loop = () => {
      // Scroll velocity (px this frame), smoothed — zero when not scrolling, so
      // it naturally decays back to flat when you stop.
      const sy = window.scrollY || window.pageYOffset || 0;
      scrollVel += (sy - lastScrollY - scrollVel) * SCROLL_SMOOTH;
      lastScrollY = sy;
      const scrollTilt = scrollVel / SCROLL_SCALE;

      // Baseline catches up to the held orientation, leaving only the motion
      // component (oriX - baseX) to drive the tilt — so a static angle fades out.
      baseX += (oriX - baseX) * BASE_FOLLOW;
      baseY += (oriY - baseY) * BASE_FOLLOW;
      const targetX = clamp1(dz(oriX - baseX));
      const targetY = clamp1(dz(oriY - baseY + scrollTilt));

      velX += (targetX - curX) * SPRING;
      velX *= DAMP;
      curX += velX;
      velY += (targetY - curY) * SPRING;
      velY *= DAMP;
      curY += velY;

      const nx = curX.toFixed(3);
      const ny = curY.toFixed(3);
      if (nx !== lastX) {
        root.style.setProperty("--tilt-x", nx);
        lastX = nx;
      }
      if (ny !== lastY) {
        root.style.setProperty("--tilt-y", ny);
        lastY = ny;
      }
      raf = requestAnimationFrame(loop);
    };

    // The spring loop runs always, so scroll drives the tilt everywhere
    // (desktop included) regardless of gyroscope availability.
    raf = requestAnimationFrame(loop);

    const startGyro = () => {
      if (gyroOn) return;
      gyroOn = true;
      window.addEventListener("deviceorientation", onOrient);
    };

    const DOE = window.DeviceOrientationEvent as DOEWithPermission | undefined;

    requestRef.current = () => {
      if (DOE && typeof DOE.requestPermission === "function") {
        DOE.requestPermission()
          .then((res) => {
            if (res === "granted") {
              setNeedsPermission(false);
              startGyro();
            }
          })
          .catch(() => {});
      } else {
        startGyro();
      }
    };

    let onGesture: (() => void) | undefined;
    if (DOE && typeof DOE.requestPermission === "function") {
      // iOS: needs an explicit opt-in. Offer the button and also try on first tap.
      setNeedsPermission(true);
      onGesture = () => requestRef.current();
      window.addEventListener("pointerdown", onGesture, { once: true });
    } else if (DOE) {
      // Android with a sensor: orientation fires without a prompt.
      startGyro();
    }

    return () => {
      window.removeEventListener("deviceorientation", onOrient);
      if (onGesture) window.removeEventListener("pointerdown", onGesture);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!needsPermission) return null;

  return (
    <button
      type="button"
      onClick={() => requestRef.current()}
      className="fixed bottom-4 left-4 z-50 flex max-w-[45vw] items-center gap-1.5 truncate rounded-full border border-amber-300/40 bg-black/70 px-3 py-1.5 text-xs font-medium text-amber-100 shadow-lg backdrop-blur active:scale-95"
    >
      <span aria-hidden>🧭</span> Enable motion tilt
    </button>
  );
}
