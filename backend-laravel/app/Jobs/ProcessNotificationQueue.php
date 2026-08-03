<?php

namespace App\Jobs;

use App\Models\Notification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Drain a backlog of pending notifications (used by a manual admin trigger
 * or a queue-batch cron). In normal operation each Notification row fans out
 * immediately via NotificationService; this job exists to retry any that
 * were left undelivered (e.g. FCM was down).
 */
class ProcessNotificationQueue implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 120;

    public function __construct(public int $limit = 100) {}

    public function handle(): int
    {
        // Re-dispatch push jobs for the most recent notifications without
        // device delivery confirmation. (We don't track delivery receipts in
        // v1, so this is effectively a best-effort re-fan-out.)
        $recent = Notification::where('created_at', '>=', now()->subHour())
            ->orderByDesc('created_at')
            ->limit($this->limit)
            ->get();

        $count = 0;
        foreach ($recent as $notif) {
            $tokens = $notif->user?->deviceTokens()->active()->pluck('device_token')->all() ?? [];
            if (empty($tokens)) {
                continue;
            }
            SendPushNotification::dispatch($notif->id, $tokens);
            $count++;
        }
        Log::info(json_encode(['level' => 'info', 'event' => 'notification_queue_drained', 'count' => $count]));
        return $count;
    }
}
