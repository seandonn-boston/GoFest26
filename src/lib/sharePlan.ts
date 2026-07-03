import { serializeState, isStateBackup, type StateBackup } from "@/store/stateBackup";

// Shareable plans ride in the URL hash (#plan=…), reusing the exact backup
// snapshot so a link carries everything a .json backup would. The hash keeps
// the payload client-side — it's never sent to a server. The JSON is gzipped
// (≈3–5× shorter link) when the browser supports CompressionStream, with a plain
// base64url fallback; both are decodable, told apart by the gzip magic bytes.
const HASH_KEY = "plan";

/** base64url-encode raw bytes (URL-safe, unpadded). */
function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

const hasCompression = typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
const GZIP_MAGIC0 = 0x1f;
const GZIP_MAGIC1 = 0x8b;

async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Encode a backup snapshot into the URL-safe payload carried after #plan=. */
export async function encodePlanPayload(backup: StateBackup): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(backup));
  if (hasCompression) {
    try {
      return bytesToB64url(await gzip(json));
    } catch {
      /* CompressionStream failed for some reason — fall back to plain base64url. */
    }
  }
  return bytesToB64url(json);
}

/** Build a shareable URL: the current page plus the encoded plan snapshot. */
export async function buildShareUrl(): Promise<string> {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${HASH_KEY}=${await encodePlanPayload(serializeState())}`;
}

// A real plan payload is a few KB; anything approaching this is not a plan.
// Rejecting before decode/JSON.parse keeps a crafted multi-MB hash from janking
// the main thread on page load (the hash is attacker-reachable via any link).
const MAX_PAYLOAD_CHARS = 262_144; // 256 KiB of base64url

/** Decode a shared plan from a location hash, or null if absent/invalid. */
export async function decodeSharedPlan(hash: string): Promise<StateBackup | null> {
  const match = hash.match(new RegExp(`[#&]${HASH_KEY}=([^&]+)`));
  if (!match || match[1].length > MAX_PAYLOAD_CHARS) return null;
  try {
    let bytes = b64urlToBytes(match[1]);
    // Gzipped payloads start with the gzip magic (1f 8b); legacy ones are raw
    // JSON text ("{" = 0x7b). Decompress the former, read the latter as-is.
    if (bytes[0] === GZIP_MAGIC0 && bytes[1] === GZIP_MAGIC1 && hasCompression) {
      bytes = await gunzip(bytes);
    }
    const obj = JSON.parse(new TextDecoder().decode(bytes));
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
