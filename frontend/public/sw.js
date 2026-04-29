const CACHE_NAME = "chainbridge-v1";

// Static assets to pre-cache on install.
const PRECACHE_URLS = ["/", "/manifest.json", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests for same-origin navigation and static assets.
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Let API and RPC calls bypass the cache entirely.
  if (url.pathname.startsWith("/api/") || url.hostname !== self.location.hostname) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Only cache successful opaque-safe responses.
          if (!response || response.status !== 200 || response.type === "opaque") {
            return response;
          }

          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
          return response;
        })
        .catch(() => {
          // If fetch fails (offline), and it's a navigation request, show the offline page.
          if (event.request.mode === "navigate") {
            return caches.match("/offline");
          }
        });
    })
  );
});
