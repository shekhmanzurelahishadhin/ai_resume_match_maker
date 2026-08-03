<?php

namespace App\Services;

use App\Jobs\SendPushNotification;
use App\Models\DeviceToken;
use App\Models\JobMatch;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Notification orchestration (§7).
 *
 * - Persists every notification to the notifications table (always-on in-app).
 * - Dispatches a SendPushNotification job for active device tokens (when push
 *   is enabled in the user's preferences).
 * - Falls back to email when the push channel is unavailable or the user
 *   has disabled push but enabled email.
 */
class NotificationService
{
    public function __construct(
        private FirebaseService $firebase,
    ) {}

    public function notifyResumeAnalysisComplete(Resume $resume): ?Notification
    {
        $prefs = $this->prefs($resume->user_id);
        if (! $prefs->resume_analysis) {
            return null;
        }

        $notif = $this->create([
            'user_id' => $resume->user_id,
            'type' => 'resume_analysis',
            'title' => 'Resume analysis complete',
            'body' => "Your resume '{$resume->file_name}' has been parsed and matched.",
            'data_json' => ['resumeId' => $resume->id, 'url' => '/dashboard'],
        ], $prefs);

        return $notif;
    }

    public function notifyNewMatch(JobMatch $match): ?Notification
    {
        $prefs = $this->prefs($match->resume->user_id ?? null);
        if (! $prefs || ! $prefs->job_matches) {
            // Notify BOTH the seeker (high match) AND the recruiter.
            $this->notifyRecruiterOfCandidate($match);
            return null;
        }

        // Only notify seekers for high-quality matches (≥ 70%) to avoid spam.
        if ($match->match_percentage < 70) {
            $this->notifyRecruiterOfCandidate($match);
            return null;
        }

        $job = $match->jobPost;
        $notif = $this->create([
            'user_id' => $match->resume->user_id,
            'type' => 'job_match',
            'title' => 'New job match',
            'body' => "Your resume matched '{$job->title}' at {$match->match_percentage}%.",
            'data_json' => [
                'matchId' => $match->id,
                'jobId' => $job->id,
                'matchPercentage' => $match->match_percentage,
                'url' => '/matches',
            ],
        ], $prefs);

        $this->notifyRecruiterOfCandidate($match);
        return $notif;
    }

    public function notifyRecruiterOfCandidate(JobMatch $match): ?Notification
    {
        if (! $match->recruiter_id) {
            return null;
        }
        $prefs = $this->prefs($match->recruiter_id);
        if (! $prefs->job_matches) {
            return null;
        }
        if ($match->match_percentage < 60) {
            return null;
        }

        return $this->create([
            'user_id' => $match->recruiter_id,
            'type' => 'job_match',
            'title' => 'New candidate match',
            'body' => "A candidate matched your job '{$match->jobPost->title}' at {$match->match_percentage}%.",
            'data_json' => [
                'matchId' => $match->id,
                'jobId' => $match->job_post_id,
                'matchPercentage' => $match->match_percentage,
                'url' => "/jobs/{$match->job_post_id}/candidates",
            ],
        ], $prefs);
    }

    public function notifyNewJobPosted(string $jobId, string $title, string $recruiterName): int
    {
        // Fan out to every seeker with new_jobs=true.
        $seekerIds = User::where('role', 'seeker')->pluck('id')->all();
        $count = 0;
        foreach ($seekerIds as $userId) {
            $prefs = $this->prefs($userId);
            if (! $prefs->new_jobs) continue;
            $this->create([
                'user_id' => $userId,
                'type' => 'new_job',
                'title' => 'New job posted',
                'body' => "'{$title}' was just posted by {$recruiterName}.",
                'data_json' => ['jobId' => $jobId, 'url' => '/jobs'],
            ], $prefs);
            $count++;
        }
        return $count;
    }

    public function notifySystem(User|string $userOrId, string $title, string $body, array $data = []): ?Notification
    {
        $userId = $userOrId instanceof User ? $userOrId->id : $userOrId;
        // System notifications bypass the per-type gate.
        return $this->create([
            'user_id' => $userId,
            'type' => 'system',
            'title' => $title,
            'body' => $body,
            'data_json' => $data,
        ], null);
    }

    public function sendDailyDigest(User $user): void
    {
        $prefs = $this->prefs($user->id);
        if (! $prefs->daily_digest || ! $prefs->email_notifications) {
            return;
        }
        $since = now()->subDay();
        $items = Notification::where('user_id', $user->id)
            ->where('created_at', '>=', $since)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();
        $unread = Notification::where('user_id', $user->id)->unread()->count();

        if ($items->isEmpty() && $unread === 0) {
            return;
        }

        try {
            Mail::to($user->email)->send(new \App\Notifications\DailyDigest($user, $items, $unread));
        } catch (\Throwable $e) {
            Log::warning(json_encode([
                'level' => 'warn', 'event' => 'digest_email_failed',
                'userId' => $user->id, 'error' => $e->getMessage(),
            ]));
        }

        // Persist a 'daily_digest' notification (gated by dailyDigest — bypassed for the digest itself).
        $this->create([
            'user_id' => $user->id,
            'type' => 'daily_digest',
            'title' => 'Daily digest sent',
            'body' => sprintf('Emailed a summary of %d notifications (%d unread).', $items->count(), $unread),
            'data_json' => ['items' => $items->count(), 'unread' => $unread],
        ], null);
    }

    // ---------- internals ----------

    private function create(array $attrs, ?NotificationPreference $prefs): ?Notification
    {
        try {
            $notif = Notification::create($attrs);
        } catch (\Throwable $e) {
            Log::warning(json_encode([
                'level' => 'warn', 'event' => 'notification_create_failed',
                'userId' => $attrs['user_id'] ?? null, 'error' => $e->getMessage(),
            ]));
            return null;
        }

        // Fan out to push + email channels based on prefs.
        $prefs ??= $this->prefs($attrs['user_id']);

        $type = $attrs['type'] ?? 'system';
        $bypassTypeGate = in_array($type, ['system', 'daily_digest'], true);

        if ($prefs->push_notifications && ($bypassTypeGate || $this->typeAllowed($prefs, $type))) {
            $this->dispatchPush($notif);
        }
        if ($prefs->email_notifications && ($bypassTypeGate || $this->typeAllowed($prefs, $type))) {
            $this->sendEmailFallback($notif, $prefs);
        }
        return $notif;
    }

    private function typeAllowed(NotificationPreference $prefs, string $type): bool
    {
        return match ($type) {
            'job_match' => $prefs->job_matches,
            'resume_analysis' => $prefs->resume_analysis,
            'new_job' => $prefs->new_jobs,
            default => true,
        };
    }

    private function dispatchPush(Notification $notif): void
    {
        $tokens = DeviceToken::where('user_id', $notif->user_id)->active()->pluck('device_token')->all();
        if (empty($tokens)) {
            return;
        }
        SendPushNotification::dispatch($notif->id, $tokens);
    }

    private function sendEmailFallback(Notification $notif, NotificationPreference $prefs): void
    {
        try {
            $user = $notif->user;
            if (! $user) return;
            $mailable = match ($notif->type) {
                'job_match' => $user->isRecruiter()
                    ? new \App\Notifications\NewCandidateMatch($notif)
                    : new \App\Notifications\NewJobMatch($notif),
                'resume_analysis' => new \App\Notifications\ResumeAnalysisComplete($notif),
                'new_job' => new \App\Notifications\NewJobPosted($notif),
                default => null,
            };
            if ($mailable === null) return;
            Mail::to($user->email)->send($mailable);
        } catch (\Throwable $e) {
            Log::warning(json_encode([
                'level' => 'warn', 'event' => 'email_fallback_failed',
                'notificationId' => $notif->id, 'error' => $e->getMessage(),
            ]));
        }
    }

    private function prefs(?string $userId): NotificationPreference
    {
        if (! $userId) {
            return new NotificationPreference(NotificationPreference::defaults());
        }
        $prefs = NotificationPreference::where('user_id', $userId)->first();
        if (! $prefs) {
            $prefs = NotificationPreference::create(array_merge(
                ['user_id' => $userId],
                NotificationPreference::defaults()
            ));
        }
        return $prefs;
    }
}
