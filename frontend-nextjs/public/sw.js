// Generic app shell service worker.
//
// Responsibilities:
//   - Cache the app shell so the dashboard loads fast on repeat visits.
//   - Fall back to cached pages when the network fails.
//   - *Not* used for Firebase Messaging — that's `firebase-messaging-sw.js`.
//
// This file is intentionally minimal. We do not cache API responses (they
// are all dynamic + auth-scoped).

const CACHE_VERSION = "matchmaker-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(["/", OFFLINE_URL]))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_VERSION)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests for http(s) URLs.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Skip Next.js internals + API routes — they're always dynamic.
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/api/")) {
    return;
  }

  // Network-first for HTML navigations, falling back to cache + offline.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_VERSION);
          cache.put(req, fresh.clone()).catch(() => undefined);
          return fresh;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
          return new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })(),
    );
    return;
  }

  // Stale-while-revalidate for static assets.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req)
        .then((fresh) => {
          cache.put(req, fresh.clone()).catch(() => undefined);
          return fresh;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })(),
  );
});
