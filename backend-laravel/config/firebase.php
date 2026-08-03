<?php

/**
 * Firebase Cloud Messaging configuration (§7).
 *
 * Server-side credentials (service account) used by app/Services/FirebaseService
 * to send push notifications via the kreait/firebase-php SDK.
 *
 * The browser-side config (apiKey, authDomain, etc.) is surfaced via
 * GET /api/notifications/firebase-config from these env vars — no secrets
 * are baked into the public JS.
 *
 * When any server-side credential is missing, FirebaseService is a graceful
 * no-op (push notifications are skipped silently; the in-app Notification
 * row still persists).
 */
return [
    'project_id' => env('FCM_PROJECT_ID', ''),
    'client_email' => env('FCM_CLIENT_EMAIL', ''),
    'private_key' => env('FCM_PRIVATE_KEY', ''),
    'enabled' => (bool) (
        env('FCM_PROJECT_ID')
        && env('FCM_CLIENT_EMAIL')
        && env('FCM_PRIVATE_KEY')
    ),
    // Public (browser) config surfaced via the firebase-config endpoint.
    'public' => [
        'apiKey' => env('FIREBASE_API_KEY', ''),
        'authDomain' => env('FIREBASE_AUTH_DOMAIN', ''),
        'projectId' => env('FIREBASE_PROJECT_ID', env('FCM_PROJECT_ID', '')),
        'storageBucket' => env('FIREBASE_STORAGE_BUCKET', ''),
        'messagingSenderId' => env('FIREBASE_MESSAGING_SENDER_ID', ''),
        'appId' => env('FIREBASE_APP_ID', ''),
        'vapidKey' => env('FIREBASE_VAPID_KEY', ''),
    ],
    // Default topic for broadcast notifications.
    'default_topic' => env('FCM_DEFAULT_TOPIC', 'all-users'),
];
