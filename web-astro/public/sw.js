// Offline support for the coffee map. Three policies, chosen by what a request is:
//   census data (shops.geojson, meta.json) → stale-while-revalidate
//   static assets (js, css, fonts, icons)   → cache-first
//   HTML shells                             → network-first, cache as the fallback
// A map that only works online is not a map you can use in a café with bad signal.
const CACHE_NAME = "coffee-map-v3";

// Pre-cache the shell and the census on install: a visitor who loads the map once and then
// loses signal should still get a map, and the shell is only cached by the HTML policy
// *after* the worker takes control — which is one page too late for that first reload.
const PRECACHE = ["./", "data/shops.geojson", "data/meta.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {}) // a failed pre-cache must not block the worker from installing
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isCensus = (url) => /\/data\/(shops\.geojson|meta\.json)$/.test(url.pathname);
const isStatic = (url) => /\.(js|css|mjs|woff2?|png|svg|webmanifest)$/.test(url.pathname);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  // External resources (Instagram, TikTok, Google Maps, tiles) bypass the cache.
  if (!req.url.startsWith(location.origin)) return;

  const url = new URL(req.url);

  // Census data: hand back what we have immediately, refresh it in the background so the
  // next visit is current. This is the pair the map cannot start without.
  if (isCensus(url)) {
    e.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        if (cached) {
          e.waitUntil(network);
          return cached;
        }
        return (await network) || Response.error();
      }),
    );
    return;
  }

  // Static assets: cache-first — a repeat visit should not touch the network at all.
  if (isStatic(url)) {
    e.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then(
          (cached) =>
            cached ||
            fetch(req).then((res) => {
              if (res && res.ok) cache.put(req, res.clone());
              return res;
            }),
        ),
      ),
    );
    return;
  }

  // Shell pages: network first, fall back to cache.
  if (req.headers.get("accept")?.includes("text/html")) {
    e.respondWith(
      fetch(req).catch(() =>
        caches
          .open(CACHE_NAME)
          .then((c) => c.match(req))
          .then((cached) => cached || Response.error()),
      ),
    );
    return;
  }
});
