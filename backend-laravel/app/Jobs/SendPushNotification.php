<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Services\FirebaseService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Send a single FCM push notification to one or more device tokens.
 * Falls back to a no-op when FCM is not configured (the in-app Notification
 * row already persists the payload).
 */
class SendPushNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $backoff = 3;
    public int $timeout = 30;

    /**
     * @param string $notificationId
     * @param list<string> $tokens
     */
    public function __construct(
        public string $notificationId,
        public array $tokens,
    ) {}

    public function handle(FirebaseService $firebase): void
    {
        if (! $firebase->isEnabled() || empty($this->tokens)) {
            return;
        }
        /** @var Notification|null $notif */
        $notif = Notification::find($this->notificationId);
        if (! $notif) {
            return;
        }
        $data = is_array($notif->data_json) ? $notif->data_json : [];

        $sent = $firebase->sendBatchNotifications($this->tokens, $notif->title, $notif->body, $data);
        Log::info(json_encode([
            'level' => 'info', 'event' => 'push_sent',
            'notificationId' => $notif->id, 'recipients' => count($this->tokens), 'succeeded' => $sent,
        ]));
    }
}
