"use client";

import { useEffect } from "react";

/**
 * Drives the enamel specular highlight from the phone's gyroscope: device
 * orientation updates CSS variables --tilt-x / --tilt-y (-1..1) on the document,
 * which the .enamel highlight reads, so pins catch the light as you tilt. On
 * iOS, motion permission is requested on the first tap. Renders nothing.
 */
export function TiltProvider() {
  useEffect(() => {
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let raf = 0;
    let running = false;
    const root = document.documentElement;

    const onOrient = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0; // left-right, ~ -90..90
      const beta = e.beta ?? 0; // front-back, ~ -180..180
      // Smaller divisor => a gentle wrist tilt already saturates the effect, so
      // the gyroscope motion is unmistakable instead of subtle.
      targetX = Math.max(-1, Math.min(1, gamma / 16));
      targetY = Math.max(-1, Math.min(1, (beta - 45) / 16));
    };

    const loop = () => {
      // Snappier follow so the badges visibly chase the phone as you tilt.
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

    const DOE = window.DeviceOrientationEvent as
      | (typeof window.DeviceOrientationEvent & { requestPermission?: () => Promise<string> })
      | undefined;

    let onGesture: (() => void) | undefined;
    if (DOE && typeof DOE.requestPermission === "function") {
      onGesture = () => {
        DOE.requestPermission!()
          .then((res) => {
            if (res === "granted") start();
          })
          .catch(() => {});
      };
      window.addEventListener("pointerdown", onGesture, { once: true });
    } else if (DOE) {
      start();
    }

    return () => {
      window.removeEventListener("deviceorientation", onOrient);
      if (onGesture) window.removeEventListener("pointerdown", onGesture);
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
