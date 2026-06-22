/*
 * GO Fest Raid Planner — offline service worker.
 *
 * Goal: the tool keeps working on event day when signal drops in a crowded
 * park. Strategy is deliberately conservative so it can never serve a stale
 * app to an ONLINE user:
 *
 *   - Navigations (HTML): network-first. Online users always get fresh markup;
 *     offline they fall back to the last cached app shell.
 *   - Same-origin assets (_next chunks, css, fonts): stale-while-revalidate —
 *     instant from cache, refreshed in the background. New deploys ship new
 *     hashed filenames, so there's never an old/new mismatch.
 *   - Cross-origin sprites (the Pokémon artwork CDN): cache-first, so the
 *     images you've already seen render with no network.
 *
 * Bumping VERSION invalidates every old cache on activate.
 */
const VERSION = "v1";
const CACHE = `gofest-${VERSION}`;
// Absolute path the app is served under (e.g. "/go-fest-raid-planner/" or "/").
const SHELL = new URL(self.registration.scope).pathname;

self.addEventListener("install", () => {
  // Take over as soon as the new worker is installed, no waiting on old tabs.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

/** Cache a response under a key, ignoring failures (e.g. quota, opaque errors). */
async function put(request, response) {
  try {
    const cache = await caches.open(CACHE);
    await cache.put(request, response);
  } catch {
    /* best-effort */
  }
}

/** Network-first: fresh when online, last-known shell when offline. */
async function handleNavigate(request) {
  try {
    const fresh = await fetch(request);
    // Keep the shell up to date for the offline fallback.
    put(SHELL, fresh.clone());
    return fresh;
  } catch {
    const cache = await caches.open(CACHE);
    return (
      (await cache.match(request)) ||
      (await cache.match(SHELL)) ||
      new Response("You're offline and this page isn't cached yet.", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    );
  }
}

/** Stale-while-revalidate: serve cache instantly if present, refresh in the
 *  background; otherwise fall through to the network and cache the result. */
async function handleAsset(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      // Only cache complete, cacheable responses (ok or cross-origin opaque).
      if (res && (res.ok || res.type === "opaque")) put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  if (cached) {
    void network; // already have it — revalidate in the background, serve cache now
    return cached;
  }
  return network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigate(request));
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  // Only cache static-ish GETs: same-origin assets, or cross-origin images.
  const isImage = request.destination === "image";
  if (sameOrigin || isImage) {
    event.respondWith(handleAsset(request));
  }
});
