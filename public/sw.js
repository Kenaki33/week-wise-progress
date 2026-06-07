// ============================================================
// Jeden Nawyk - service worker (PWA)
// Strategia: network-first dla wlasnych plikow + fallback offline.
// Online zawsze wygrywa siec -> brak problemu ze "stara wersja".
// ============================================================

const CACHE = "jn-cache-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      // Cache'ujemy tylko wlasne pliki (HTML/JS/CSS/ikony), nie zapytania do API.
      if (sameOrigin && fresh && fresh.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === "navigate") {
        const home = await caches.match("/");
        if (home) return home;
      }
      throw err;
    }
  })());
});
