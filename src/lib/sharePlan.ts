import { serializeState, isStateBackup, type StateBackup } from "@/store/stateBackup";

// Shareable plans ride in the URL hash (#plan=…), reusing the exact backup
// snapshot so a link carries everything a .json backup would. The hash keeps
// the payload client-side — it's never sent to a server.
const HASH_KEY = "plan";

/** base64url-encode a UTF-8 string (URL-safe, unpadded). */
function encode(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decode(s: string): string {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Encode a backup snapshot into the URL-safe payload carried after #plan=. */
export function encodePlanPayload(backup: StateBackup): string {
  return encode(JSON.stringify(backup));
}

/** Build a shareable URL: the current page plus the encoded plan snapshot. */
export function buildShareUrl(): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${HASH_KEY}=${encodePlanPayload(serializeState())}`;
}

/** Decode a shared plan from a location hash, or null if absent/invalid. */
export function decodeSharedPlan(hash: string): StateBackup | null {
  const match = hash.match(new RegExp(`[#&]${HASH_KEY}=([^&]+)`));
  if (!match) return null;
  try {
    const obj = JSON.parse(decode(match[1]));
    return isStateBackup(obj) ? obj : null;
  } catch {
    return null;
  }
}

/** Remove the plan payload from the address bar without reloading. */
export function clearPlanHash(): void {
  const { origin, pathname, search } = window.location;
  history.replaceState(null, "", `${origin}${pathname}${search}`);
}
