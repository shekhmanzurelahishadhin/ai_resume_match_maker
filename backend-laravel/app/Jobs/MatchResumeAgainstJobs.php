<?php

namespace App\Jobs;

use App\Models\JobPost;
use App\Services\MatchService;
use App\Services\NotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Fired on new job creation: match this job against every ready seeker resume
 * and notify seekers of the new posting.
 */
class MatchResumeAgainstJobs implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 5;

    public function __construct(public string $jobId) {}

    public function handle(MatchService $matcher, NotificationService $notifications): void
    {
        /** @var JobPost|null $job */
        $job = JobPost::find($this->jobId);
        if (! $job) {
            return;
        }

        try {
            $matcher->matchJobAgainstAllResumes($job);
        } catch (\Throwable $e) {
            Log::warning(json_encode([
                'level' => 'warn', 'event' => 'job_match_failed',
                'jobId' => $job->id, 'error' => $e->getMessage(),
            ]));
        }

        try {
            $notifications->notifyNewJobPosted($job->id, $job->title, $job->recruiter->name ?? 'a recruiter');
        } catch (\Throwable $e) {
            Log::warning(json_encode([
                'level' => 'warn', 'event' => 'new_job_notify_failed',
                'jobId' => $job->id, 'error' => $e->getMessage(),
            ]));
        }
    }
}
