<?php

namespace App\Jobs;

use App\Models\NotificationPreference;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Compile + send the daily digest email for every user with
 * daily_digest=true AND email_notifications=true.
 *
 * Scheduled at 09:00 via routes/console.php.
 */
class SendDailyDigest implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;

    public function handle(NotificationService $notifications): int
    {
        $subscriberIds = NotificationPreference::where('daily_digest', true)
            ->where('email_notifications', true)
            ->pluck('user_id')
            ->all();

        $sent = 0;
        foreach ($subscriberIds as $userId) {
            $user = User::find($userId);
            if (! $user) continue;
            try {
                $notifications->sendDailyDigest($user);
                $sent++;
            } catch (\Throwable $e) {
                Log::warning(json_encode([
                    'level' => 'warn', 'event' => 'digest_user_failed',
                    'userId' => $userId, 'error' => $e->getMessage(),
                ]));
            }
        }
        Log::info(json_encode(['level' => 'info', 'event' => 'daily_digest_complete', 'sent' => $sent]));
        return $sent;
    }
}
