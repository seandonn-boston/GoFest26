"use client";

import { useEffect, useRef } from "react";
import { useTiltStore } from "@/store/useTiltStore";

type DOEWithPermission = typeof window.DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied" | "default">;
};

/**
 * Drives the enamel badge tilt from the phone's gyroscope: device orientation
 * updates CSS variables --tilt-x / --tilt-y (-1..1) on the document, which the
 * .badge transform reads. Strictly opt-in from the FAB — nothing runs until the
 * user enables it, and the animation loop exists ONLY while enabled (so an idle
 * page does zero per-frame work). There is no scroll-driven tilt. Renders nothing.
 */
export function TiltProvider() {
  const enabled = useTiltStore((s) => s.enabled);
  const setEnabled = useTiltStore((s) => s.setEnabled);
  const requestRef = useRef<() => void>(() => {});

  // One-time: detect sensor support + how to request motion permission.
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const DOE = window.DeviceOrientationEvent as DOEWithPermission | undefined;
    requestRef.current = () => {
      if (DOE && typeof DOE.requestPermission === "function") {
        DOE.requestPermission()
          .then((res) => res === "granted" && setEnabled(true))
          .catch(() => {});
      } else if (DOE) {
        setEnabled(true);
      }
    };
    useTiltStore.getState()._register(() => requestRef.current(), !!DOE && !reduce);
  }, [setEnabled]);

  // The gyroscope spring loop runs only while enabled; turning it off cancels
  // the rAF and resets the badges flat.
  useEffect(() => {
    const root = document.documentElement;
    if (!enabled) {
      root.style.setProperty("--tilt-x", "0");
      root.style.setProperty("--tilt-y", "0");
      return;
    }

    // Latest orientation offset from "held vertical", a slow baseline that
    // absorbs the held angle (high-pass — only motion tilts), and a soft spring.
    let oriX = 0;
    let oriY = 0;
    let baseX = 0;
    let baseY = 0;
    let curX = 0;
    let curY = 0;
    let velX = 0;
    let velY = 0;
    let raf = 0;
    let lastX = "";
    let lastY = "";

    const BASE_FOLLOW = 0.02; // how fast a held tilt decays back to flat (~1s)
    const DEADZONE = 0.12; // firmer nudge required before any motion begins
    const SPRING = 0.085; // soft spring => sluggish, elastic
    const DAMP = 0.86; // <1 leaves a little overshoot on the way back

    const dz = (v: number) => (v > DEADZONE ? v - DEADZONE : v < -DEADZONE ? v + DEADZONE : 0);
    const clampOri = (v: number) => Math.max(-2, Math.min(2, v));
    const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

    const onOrient = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0; // left-right (0 held vertically)
      const beta = e.beta ?? 0; // front-back (~90 held vertically)
      oriX = clampOri(gamma / 16);
      oriY = clampOri((beta - 90) / 16);
    };

    const loop = () => {
      baseX += (oriX - baseX) * BASE_FOLLOW;
      baseY += (oriY - baseY) * BASE_FOLLOW;
      const targetX = clamp1(dz(oriX - baseX));
      const targetY = clamp1(dz(oriY - baseY));

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

    window.addEventListener("deviceorientation", onOrient);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("deviceorientation", onOrient);
      cancelAnimationFrame(raf);
      root.style.setProperty("--tilt-x", "0");
      root.style.setProperty("--tilt-y", "0");
    };
  }, [enabled]);

  return null;
}
