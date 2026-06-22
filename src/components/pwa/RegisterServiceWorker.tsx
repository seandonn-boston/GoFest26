"use client";

import { useEffect } from "react";

// Registers the offline service worker. Renders nothing. Production-only — in
// dev a worker would fight Next's HMR and serve stale chunks. The script and
// scope are base-path aware (the app is served under /go-fest-raid-planner).
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const swUrl = `${base}/sw.js`;
    const scope = `${base}/`;

    const register = () => {
      navigator.serviceWorker.register(swUrl, { scope }).catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    };

    // Wait for load so the SW install doesn't contend with first paint.
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
