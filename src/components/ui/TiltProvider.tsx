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
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let raf = 0;
    let running = false;
    const root = document.documentElement;

    const onOrient = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0; // left-right, ~ -90..90 (0 held vertically)
      const beta = e.beta ?? 0; // front-back, ~ 90 when held perfectly vertical
      // Origin = phone held vertically (beta ≈ 90, gamma ≈ 0) => 0,0 (no tilt).
      // Tilting the top away from you (beta < 90) pushes the card's top back and
      // its bottom toward you; left/right follows gamma. ~16° of phone tilt
      // reaches the full card tilt.
      targetX = Math.max(-1, Math.min(1, gamma / 16));
      targetY = Math.max(-1, Math.min(1, (beta - 90) / 16));
    };

    const loop = () => {
      curX += (targetX - curX) * 0.22;
      curY += (targetY - curY) * 0.22;
      root.style.setProperty("--tilt-x", curX.toFixed(3));
      root.style.setProperty("--tilt-y", curY.toFixed(3));
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running) return;
      running = true;
      window.addEventListener("deviceorientation", onOrient);
      raf = requestAnimationFrame(loop);
    };

    const DOE = window.DeviceOrientationEvent as DOEWithPermission | undefined;

    requestRef.current = () => {
      if (DOE && typeof DOE.requestPermission === "function") {
        DOE.requestPermission()
          .then((res) => {
            if (res === "granted") {
              setNeedsPermission(false);
              start();
            }
          })
          .catch(() => {});
      } else {
        start();
      }
    };

    let onGesture: (() => void) | undefined;
    if (DOE && typeof DOE.requestPermission === "function") {
      // iOS: needs an explicit opt-in. Offer the button and also try on first tap.
      setNeedsPermission(true);
      onGesture = () => requestRef.current();
      window.addEventListener("pointerdown", onGesture, { once: true });
    } else if (DOE) {
      // Android / desktop with a sensor: orientation fires without a prompt.
      start();
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
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full border border-amber-300/40 bg-black/70 px-3 py-1.5 text-xs font-medium text-amber-100 shadow-lg backdrop-blur active:scale-95"
    >
      <span aria-hidden>🧭</span> Enable motion tilt
    </button>
  );
}
