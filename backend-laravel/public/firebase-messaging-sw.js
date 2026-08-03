// Firebase Messaging service worker (mirror of the Next.js public/firebase-messaging-sw.js).
//
// Handles background push messages + click-to-navigate using notification.data.url.
// Fetches its Firebase config from /api/notifications/firebase-config at install
// time so no secrets are baked into this static file.

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
