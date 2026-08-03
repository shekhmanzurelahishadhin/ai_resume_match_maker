// Firebase Messaging service worker.
//
// Handles background push messages (when the tab is closed or in the
// background) and click-to-navigate using `notification.data.url`.
//
// The firebase client SDK auto-registers this file by name when
// `getToken()` is called from the browser. We import the SDK from the
// Google CDN because service workers can't use ES module imports from
// `node_modules` at runtime — they need a top-level URL the browser can
// fetch.
//
// CONFIG: this SW fetches its Firebase config from
//   `/api/notifications/firebase-config` (a public, no-auth endpoint) at
// install time so we don't hard-code secrets. If that endpoint returns an
// empty config (e.g., in the sandbox), messaging is silently skipped and
// only the generic push handler below runs (which the firebase SDK
// would normally override when configured).

// --- App shell cache (lightweight) ---
const CACHE_NAME = "matchmaker-shell-v1";
const SHELL_URLS = ["/", "/login"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

// --- Bootstrap Firebase Messaging ---
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

let messaging = null;

async function bootstrapFirebase() {
  try {
    const res = await fetch("/api/notifications/firebase-config", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    const config = json?.data?.config;
    if (!config || !config.apiKey || !config.projectId) return;
    firebase.initializeApp(config);
    messaging = firebase.messaging();
    // Let the SDK handle background messages.
    messaging.onBackgroundMessage((payload) => {
      const notification = payload.notification || {};
      const data = payload.data || {};
      const title = notification.title || data.title || "Resume Matchmaker";
      const body = notification.body || data.body || "";
      const url = data.url || "/";
      self.registration.showNotification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/badge-72.png",
        data: { url },
        requireInteraction: false,
      });
    });
  } catch (e) {
    // SW runs without messaging — the generic `push` listener below still
    // shows notifications from raw push events.
    console.warn("fcm_sw_bootstrap_failed", e);
  }
}

bootstrapFirebase();

// --- Notification click → navigate the focused client to data.url ---
self.addEventListener("notificationclick", (event) => {
  const url = (event.notification && event.notification.data && event.notification.data.url) || "/";
  event.notification.close();

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          try {
            await client.focus();
            if ("navigate" in client) {
              await client.navigate(url);
            }
            return;
          } catch {
            // fall through
          }
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })(),
  );
});

// --- Push event (fallback when the firebase SDK is not bootstrapped) ---
self.addEventListener("push", (event) => {
  // If the SDK is configured, it has its own push handler — but adding a
  // no-op guard here prevents double-display in case both fire.
  if (messaging) return;
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { data: { body: event.data.text() } };
  }
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || "Resume Matchmaker";
  const body = notification.body || data.body || "";
  const url = data.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      data: { url },
    }),
  );
});
