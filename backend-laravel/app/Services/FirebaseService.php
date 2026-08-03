<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging as FirebaseMessaging;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\MulticastSendReport;
use Kreait\Firebase\Messaging\Notification as FcmNotification;

/**
 * Firebase Cloud Messaging (FCM) wrapper (§7).
 *
 * Uses kreait/firebase-php to send pushes. When FCM_* env vars are missing
 * (config('firebase.enabled') === false), every method is a graceful no-op —
 * push notifications are silently skipped while the in-app Notification row
 * still persists.
 */
class FirebaseService
{
    private ?FirebaseMessaging $messaging = null;
    private bool $enabled;

    public function __construct()
    {
        $this->enabled = (bool) config('firebase.enabled', false);
        if ($this->enabled) {
            try {
                $factory = (new Factory())
                    ->withServiceAccount([
                        'project_id' => config('firebase.project_id'),
                        'client_email' => config('firebase.client_email'),
                        'private_key' => str_replace('\\n', "\n", config('firebase.private_key')),
                    ]);
                $this->messaging = $factory->createMessaging();
            } catch (\Throwable $e) {
                Log::warning(json_encode([
                    'level' => 'warn', 'event' => 'fcm_init_failed',
                    'error' => $e->getMessage(),
                ]));
                $this->enabled = false;
                $this->messaging = null;
            }
        }
    }

    public function isEnabled(): bool
    {
        return $this->enabled && $this->messaging !== null;
    }

    /**
     * Send a single push to one device token.
     */
    public function sendPushNotification(string $token, string $title, string $body, array $data = []): bool
    {
        if (! $this->isEnabled()) {
            return false;
        }
        try {
            $message = CloudMessage::withTarget('token', $token)
                ->withNotification(FcmNotification::create($title, $body))
                ->withData($this->stringifyData($data));
            $this->messaging->send($message);
            return true;
        } catch (\Throwable $e) {
            Log::warning(json_encode([
                'level' => 'warn', 'event' => 'fcm_send_failed',
                'token' => substr($token, 0, 8).'...', 'error' => $e->getMessage(),
            ]));
            return false;
        }
    }

    /**
     * Send the same notification to a list of tokens (multicast).
     *
     * @param list<string> $tokens
     */
    public function sendBatchNotifications(array $tokens, string $title, string $body, array $data = []): int
    {
        if (! $this->isEnabled() || empty($tokens)) {
            return 0;
        }
        try {
            $message = CloudMessage::new()
                ->withNotification(FcmNotification::create($title, $body))
                ->withData($this->stringifyData($data));
            /** @var MulticastSendReport $report */
            $report = $this->messaging->sendMulticast($message, $tokens);
            return $report->successes()->count();
        } catch (\Throwable $e) {
            Log::warning(json_encode([
                'level' => 'warn', 'event' => 'fcm_batch_failed',
                'error' => $e->getMessage(),
            ]));
            return 0;
        }
    }

    public function sendTopicNotification(string $topic, string $title, string $body, array $data = []): bool
    {
        if (! $this->isEnabled()) {
            return false;
        }
        try {
            $message = CloudMessage::withTarget('topic', $topic)
                ->withNotification(FcmNotification::create($title, $body))
                ->withData($this->stringifyData($data));
            $this->messaging->send($message);
            return true;
        } catch (\Throwable $e) {
            Log::warning(json_encode([
                'level' => 'warn', 'event' => 'fcm_topic_failed',
                'topic' => $topic, 'error' => $e->getMessage(),
            ]));
            return false;
        }
    }

    public function subscribeToTopic(array $tokens, string $topic): bool
    {
        if (! $this->isEnabled() || empty($tokens)) {
            return false;
        }
        try {
            $this->messaging->subscribeToTopic($tokens, $topic);
            return true;
        } catch (\Throwable $e) {
            Log::warning(json_encode(['level' => 'warn', 'event' => 'fcm_subscribe_failed', 'error' => $e->getMessage()]));
            return false;
        }
    }

    public function unsubscribeFromTopic(array $tokens, string $topic): bool
    {
        if (! $this->isEnabled() || empty($tokens)) {
            return false;
        }
        try {
            $this->messaging->unsubscribeFromTopic($tokens, $topic);
            return true;
        } catch (\Throwable $e) {
            Log::warning(json_encode(['level' => 'warn', 'event' => 'fcm_unsubscribe_failed', 'error' => $e->getMessage()]));
            return false;
        }
    }

    /**
     * FCM data payload must be all strings.
     */
    private function stringifyData(array $data): array
    {
        $out = [];
        foreach ($data as $k => $v) {
            $out[$k] = is_string($v) ? $v : (string) json_encode($v);
        }
        return $out;
    }
}
