// Client-side notification helpers.
//
// These run in the browser. They request notification permission, fetch an
// FCM token, and listen for foreground messages. They are all guarded so
// they no-op gracefully when:
//   - we're on the server (SSR),
//   - the browser doesn't support service workers / Notification,
//   - or `NEXT_PUBLIC_FIREBASE_VAPID_KEY` is unset.
//
// The firebase client SDK (`firebase/messaging`) is imported lazily inside
// each function so the bundle only loads it when actually used.

import type { Messaging } from "firebase/messaging";

let messagingInstance: Messaging | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isSupportedEnv(): boolean {
  return (
    isBrowser() &&
    "serviceWorker" in navigator &&
    typeof window.Notification !== "undefined" &&
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY)
  );
}

async function getMessaging(): Promise<Messaging | null> {
  if (!isSupportedEnv()) return null;
  if (messagingInstance) return messagingInstance;
  if (messagingPromise) return messagingPromise;

  messagingPromise = (async () => {
    try {
      // firebase/app + firebase/messaging are heavy — lazy-load them.
      const { initializeApp } = await import("firebase/app");
      const { getMessaging, isSupported } = await import("firebase/messaging");

      const supported = await isSupported();
      if (!supported) return null;

      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      // Don't initialize if any required field is missing.
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        return null;
      }

      const app = initializeApp(firebaseConfig);
      messagingInstance = getMessaging(app);
      return messagingInstance;
    } catch (e) {
      console.warn(
        JSON.stringify({
          level: "warn",
          event: "fcm_client_init_failed",
          error: e instanceof Error ? e.message : String(e),
        }),
      );
      return null;
    }
  })();

  return messagingPromise;
}

/**
 * Request the user's permission to show notifications. Returns the
 * NotificationPermission status ("granted" | "denied" | "default").
 *
 * Safe to call repeatedly — the browser handles de-duping the prompt.
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!isBrowser() || typeof window.Notification === "undefined") {
    return "denied";
  }
  if (window.Notification.permission === "granted") return "granted";
  try {
    return await window.Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/**
 * Get the FCM registration token for this browser. Returns `null` if the
 * user hasn't granted permission, the browser doesn't support messaging,
 * or the env vars are missing.
 *
 * The token should be sent to `POST /api/notifications/register-device` so
 * the server can push to it.
 */
export async function getToken(): Promise<string | null> {
  const messaging = await getMessaging();
  if (!messaging) return null;

  if (window.Notification.permission !== "granted") return null;

  try {
    const { getToken: fbGetToken } = await import("firebase/messaging");
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) return null;

    // Register the service worker at the well-known path so the firebase
    // SDK can hand off background-message handling.
    const swReg = await navigator.serviceWorker
      .register("/firebase-messaging-sw.js", { scope: "/" })
      .catch(() => null);

    const token = await fbGetToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg ?? undefined,
    });
    return token ?? null;
  } catch (e) {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "fcm_get_token_failed",
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return null;
  }
}

/**
 * Subscribe to foreground push messages (when the tab is open).
 * Pass a callback that receives the message payload. Returns an unsubscribe
 * function.
 */
export function onMessageListener(
  cb: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void,
): () => void {
  let unsubscribe: (() => void) | null = null;
  let cancelled = false;

  getMessaging()
    .then(async (m) => {
      if (!m || cancelled) return;
      const { onMessage } = await import("firebase/messaging");
      unsubscribe = onMessage(m, cb);
    })
    .catch(() => undefined);

  return () => {
    cancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

/**
 * Convenience: request permission + get token + register with the server.
 * Returns the registered token (or null).
 *
 * Pass the user's session token if your register endpoint needs auth —
 * but since /api/notifications/register-device uses the NextAuth cookie,
 * no auth header is needed here.
 */
export async function enablePush(): Promise<string | null> {
  const perm = await requestPermission();
  if (perm !== "granted") return null;
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch("/api/notifications/register-device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceToken: token,
        deviceType: "web",
        browserInfo: navigator.userAgent,
      }),
    });
    if (!res.ok) {
      console.warn("register-device failed", res.status);
      return null;
    }
    return token;
  } catch (e) {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "fcm_register_failed",
        error: e instanceof Error ? e.message : String(e),
      }),
    );
    return null;
  }
}
