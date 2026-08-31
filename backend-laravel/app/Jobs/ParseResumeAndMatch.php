<?php

namespace App\Jobs;

use App\Enums\ResumeStatus;
use App\Models\Resume;
use App\Services\Contracts\AiService;
use App\Services\MatchService;
use App\Services\NotificationService;
use App\Services\PdfParserService;
use App\Services\StorageService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Parse a freshly-uploaded resume + match it against every active job.
 *
 * Flow:
 *   1. Mark Resume.status='parsing'.
 *   2. Read the PDF bytes from StorageService.
 *   3. Extract text via PdfParserService.
 *   4. Extract skills via the configured AiService (with fallback).
 *   5. Compute experience_years via MatchService::computeExperienceYears.
 *   6. Update Resume: status='ready' (or 'failed' with parse_error).
 *   7. Run MatchService::matchResumeAgainstAllJobs.
 *   8. Notify the seeker that analysis is complete.
 */
class ParseResumeAndMatch implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 5;
    public int $timeout = 120;

    public function __construct(
        public string $resumeId,
    ) {}

    public function handle(
        StorageService $storage,
        PdfParserService $pdfParser,
        AiService $hf,
        MatchService $matcher,
        NotificationService $notifications,
    ): void {
        /** @var Resume|null $resume */
        $resume = Resume::find($this->resumeId);
        if (! $resume) {
            Log::warning(json_encode(['level' => 'warn', 'event' => 'parse_resume_missing', 'resumeId' => $this->resumeId]));
            return;
        }

        if ($resume->status === ResumeStatus::Ready) {
            return; // already parsed
        }

        $resume->status = ResumeStatus::Parsing;
        $resume->save();

        // 1. Read the PDF bytes.
        $bytes = $storage->get($resume->file_path);
        if ($bytes === null) {
            $this->fail($resume, "Stored file not found at key: {$resume->file_path}");
            return;
        }

        // 2. Extract text.
        $result = $pdfParser->extractText($bytes);
        if (! $result->ok) {
            $this->fail($resume, $result->error ?? 'Unknown parse error');
            return;
        }
        $text = $result->text;

        // 3. Extract skills.
        $skillsResult = $hf->extractSkills($text);

        // 4. Experience years heuristic.
        $experienceYears = $matcher->computeExperienceYears($text);

        DB::transaction(function () use ($resume, $text, $skillsResult, $experienceYears) {
            $resume->extracted_text = $text;
            $resume->skills_json = $skillsResult->result;
            $resume->experience_years = $experienceYears;
            $resume->status = ResumeStatus::Ready;
            $resume->parse_error = null;
            $resume->save();
        });

        // 5. Run matching against every active job.
        try {
            $matcher->matchResumeAgainstAllJobs($resume);
        } catch (\Throwable $e) {
            Log::warning(json_encode([
                'level' => 'warn', 'event' => 'resume_match_failed',
                'resumeId' => $resume->id, 'error' => $e->getMessage(),
            ]));
        }

        // 6. Notify the seeker.
        try {
            $notifications->notifyResumeAnalysisComplete($resume->fresh());
        } catch (\Throwable $e) {
            Log::warning(json_encode([
                'level' => 'warn', 'event' => 'resume_analysis_notify_failed',
                'resumeId' => $resume->id, 'error' => $e->getMessage(),
            ]));
        }
    }

    private function fail(Resume $resume, string $error): void
    {
        $resume->status = ResumeStatus::Failed;
        $resume->parse_error = $error;
        $resume->save();
        Log::warning(json_encode([
            'level' => 'warn', 'event' => 'resume_parse_failed',
            'resumeId' => $resume->id, 'error' => $error,
        ]));
    }
}
