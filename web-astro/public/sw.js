const CACHE_NAME = "coffee-map-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // External resources (Facebook, Instagram, TikTok, …) bypass the cache.
  if (!req.url.startsWith(location.origin)) return;

  // Cache-first for static assets & shop data, network fallback to cache.
  if (
    req.url.includes("/coffee-map/data/shops.geojson") ||
    req.url.includes("/coffee-map/data/meta.json") ||
    req.url.includes("/coffee-map/styles/") ||
    req.url.includes("/coffee-map/icon")
  ) {
    e.respondWith(
      caches
        .open(CACHE_NAME)
        .then((cache) =>
          cache.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req).then((r) => {
              cache.put(req, r.clone());
              return r;
            });
          })
        )
    );
    return;
  }

  // Shell pages: network first, fall back to cache.
  if (req.headers.get("accept")?.includes("text/html")) {
    e.respondWith(
      fetch(req).catch(() => caches.open(CACHE_NAME).then((c) => c.match(req)))
    );
    return;
  }
});
