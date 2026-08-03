// Firebase Cloud Messaging (FCM) service.
//
// Per spec §7: implements `sendPushNotification`, `sendBatchNotifications`,
// `sendTopicNotification`, `subscribeToTopic`, `unsubscribeFromTopic`.
//
// Sandbox behaviour: if `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, or
// `FIREBASE_PRIVATE_KEY` env vars are missing, every method gracefully
// no-ops and logs "FCM not configured" rather than throwing. This lets the
// rest of the notification pipeline (DB persistence + email fallback) keep
// working end-to-end during local development.
//
// Token health: when FCM returns an "UNREGISTERED" error for a token, the
// caller is expected to mark that token as inactive in the DB. The
// per-token result objects include `unregistered: true` so callers can
// react accordingly.

import admin from "firebase-admin";

// ---------- types ----------

export interface SendPushInput {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface SendPushResult {
  success: boolean;
  messageId?: string;
  error?: string;
  unregistered?: boolean;
}

export interface SendBatchInput {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface SendBatchResult {
  results: Record<string, SendPushResult>;
  successCount: number;
  failureCount: number;
}

export interface SendTopicInput {
  topic: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface TopicSubscriptionResult {
  success: boolean;
  error?: string;
  successCount: number;
  failureCount: number;
}

// ---------- initialization (lazy + safe) ----------

let app: admin.app.App | null = null;
let initError: string | null = null;
let initAttempted = false;

function isConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

function getApp(): admin.app.App | null {
  if (initAttempted) return app;
  initAttempted = true;

  if (!isConfigured()) {
    initError = "Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY";
    console.info(
      JSON.stringify({
        level: "info",
        event: "fcm_not_configured",
        reason: initError,
      }),
    );
    return null;
  }

  try {
    // The private key env var usually has escaped newlines (\n). Replace them
    // so the PEM is well-formed.
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(
      /\\n/g,
      "\n",
    );

    app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
    console.info(
      JSON.stringify({
        level: "info",
        event: "fcm_initialized",
        projectId: process.env.FIREBASE_PROJECT_ID,
      }),
    );
    return app;
  } catch (e) {
    initError = e instanceof Error ? e.message : String(e);
    console.error(
      JSON.stringify({
        level: "error",
        event: "fcm_init_failed",
        error: initError,
      }),
    );
    app = null;
    return null;
  }
}

// ---------- helpers ----------

/** FCM error codes that mean "this token will never work again". */
const UNREGISTERED_CODES = new Set([
  "UNREGISTERED",
  "invalid-registration-token",
  "registration-token-not-registered",
]);

function buildMessage(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): admin.messaging.Message {
  return {
    token,
    notification: { title, body },
    // FCM data payload must be string-keyed. We always include `title`/`body`
    // so service-worker notifications render identically when the page is closed.
    data: {
      ...(data ?? {}),
      title,
      body,
    },
    android: {
      priority: "high",
      notification: { channelId: "matchmaker" },
    },
    webpush: {
      notification: {
        title,
        body,
        icon: "/icon-192.png",
        badge: "/badge-72.png",
        requireInteraction: false,
      },
      fcmOptions: { link: data?.url ?? "/" },
    },
  };
}

// ---------- public API ----------

/**
 * Send a push notification to a single device token.
 */
export async function sendPushNotification(
  input: SendPushInput,
): Promise<SendPushResult> {
  const instance = getApp();
  if (!instance) {
    return { success: false, error: initError ?? "FCM not configured" };
  }
  try {
    const messageId = await instance.messaging().send(buildMessage(input.token, input.title, input.body, input.data));
    return { success: true, messageId };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const code = err?.code ?? "unknown";
    return {
      success: false,
      error: err?.message ?? String(e),
      unregistered: UNREGISTERED_CODES.has(code),
    };
  }
}

/**
 * Send a push notification to many device tokens. Uses `sendEachForMulticast`
 * (the modern, non-deprecated batch API) when available; falls back to per-token
 * `send` calls for older firebase-admin versions.
 */
export async function sendBatchNotifications(
  input: SendBatchInput,
): Promise<SendBatchResult> {
  const instance = getApp();
  if (!instance) {
    return {
      results: Object.fromEntries(
        input.tokens.map((t) => [
          t,
          { success: false, error: initError ?? "FCM not configured" } satisfies SendPushResult,
        ]),
      ),
      successCount: 0,
      failureCount: input.tokens.length,
    };
  }

  const messaging = instance.messaging();
  const messages = input.tokens.map((t) =>
    buildMessage(t, input.title, input.body, input.data),
  );

  let responses: admin.messaging.SendResponse[] = [];
  try {
    // `sendEachForMulticast` was added in firebase-admin v12. Cast to any
    // to keep TypeScript happy across versions.
    type WithMulticast = {
      sendEachForMulticast?: (
        m: admin.messaging.Message[],
      ) => Promise<admin.messaging.BatchResponse>;
    };
    const m = messaging as unknown as WithMulticast;
    if (typeof m.sendEachForMulticast === "function") {
      const batch = await m.sendEachForMulticast(messages);
      responses = batch.responses;
    } else {
      // Fallback: send one-by-one. Slower but works on any version.
      for (const msg of messages) {
        try {
          const id = await messaging.send(msg);
          responses.push({ success: true, messageId: id });
        } catch (e) {
          responses.push({
            success: false,
            error: e as admin.FirebaseError,
          });
        }
      }
    }
  } catch (e) {
    // Whole batch blew up — record a failure for every token.
    const msg = e instanceof Error ? e.message : String(e);
    return {
      results: Object.fromEntries(
        input.tokens.map((t) => [t, { success: false, error: msg } satisfies SendPushResult]),
      ),
      successCount: 0,
      failureCount: input.tokens.length,
    };
  }

  const results: Record<string, SendPushResult> = {};
  let successCount = 0;
  let failureCount = 0;
  for (let i = 0; i < input.tokens.length; i++) {
    const r = responses[i];
    const token = input.tokens[i];
    if (r?.success) {
      results[token] = { success: true, messageId: r.messageId };
      successCount++;
    } else {
      const code = (r?.error as { code?: string })?.code ?? "unknown";
      results[token] = {
        success: false,
        error: r?.error?.message ?? "unknown error",
        unregistered: UNREGISTERED_CODES.has(code),
      };
      failureCount++;
    }
  }
  return { results, successCount, failureCount };
}

/**
 * Send a push notification to a topic (e.g., "new-jobs-seekers").
 */
export async function sendTopicNotification(
  input: SendTopicInput,
): Promise<SendPushResult> {
  const instance = getApp();
  if (!instance) {
    return { success: false, error: initError ?? "FCM not configured" };
  }
  try {
    const message: admin.messaging.Message = {
      topic: input.topic,
      notification: { title: input.title, body: input.body },
      data: { ...(input.data ?? {}), title: input.title, body: input.body },
    };
    const messageId = await instance.messaging().send(message);
    return { success: true, messageId };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Subscribe an array of device tokens to a topic.
 */
export async function subscribeToTopic(params: {
  tokens: string[];
  topic: string;
}): Promise<TopicSubscriptionResult> {
  const instance = getApp();
  if (!instance) {
    return {
      success: false,
      error: initError ?? "FCM not configured",
      successCount: 0,
      failureCount: params.tokens.length,
    };
  }
  if (params.tokens.length === 0) {
    return { success: true, successCount: 0, failureCount: 0 };
  }
  try {
    const res = await instance
      .messaging()
      .subscribeToTopic(params.tokens, params.topic);
    return {
      success: res.failureCount === 0,
      successCount: res.successCount,
      failureCount: res.failureCount,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      successCount: 0,
      failureCount: params.tokens.length,
    };
  }
}

/**
 * Unsubscribe an array of device tokens from a topic.
 */
export async function unsubscribeFromTopic(params: {
  tokens: string[];
  topic: string;
}): Promise<TopicSubscriptionResult> {
  const instance = getApp();
  if (!instance) {
    return {
      success: false,
      error: initError ?? "FCM not configured",
      successCount: 0,
      failureCount: params.tokens.length,
    };
  }
  if (params.tokens.length === 0) {
    return { success: true, successCount: 0, failureCount: 0 };
  }
  try {
    const res = await instance
      .messaging()
      .unsubscribeFromTopic(params.tokens, params.topic);
    return {
      success: res.failureCount === 0,
      successCount: res.successCount,
      failureCount: res.failureCount,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      successCount: 0,
      failureCount: params.tokens.length,
    };
  }
}

/**
 * Test-only helper to reset the singleton (useful for tests that mock env).
 * Not exported through the public surface of the notification service.
 */
export function _resetFcmForTests(): void {
  if (app) {
    app.delete().catch(() => undefined);
  }
  app = null;
  initError = null;
  initAttempted = false;
}
