import { useEffect, useState } from "react";

/**
 * Phone/tablet detection from the userAgent. Client-only — returns false during
 * SSR and the first paint, then resolves after mount (so it never causes a
 * hydration mismatch).
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent || "";
    const byUA = /Android|iPhone|iPad|iPod|Mobile|Windows Phone|BlackBerry|Opera Mini|IEMobile/i.test(ua);
    // iPadOS 13+ masquerades as desktop Safari — catch it via touch points.
    const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
    setMobile(byUA || iPadOS);
  }, []);
  return mobile;
}
