<?php

namespace App\Services;

use App\Models\JobPost;
use App\Models\JobMatch;
use App\Models\Resume;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Match orchestration (§4 of spec).
 *
 * Scoring formula:
 *   match_percentage = round(100 * (0.70 * semantic_similarity + 0.30 * skills_overlap))
 *
 * Cache: 7-day TTL, keyed on md5(resumeText + "\0" + jobText), stored in the
 * ai_caches table (model App\Models\AiCache). When the AI source changes
 * mid-window, the cached value is still served (it's annotated with the
 * source that produced it).
 */
class MatchService
{
    public function __construct(
        private HuggingFaceService $hf,
        private NotificationService $notifications,
    ) {}

    /**
     * Compute the match score between a resume and a job.
     *
     * @param list<string> $resumeSkills
     * @param list<string> $jobRequiredSkills
     * @return MatchComputed
     */
    public function computeMatch(
        string $resumeText,
        array $resumeSkills,
        string $jobText,
        array $jobRequiredSkills,
    ): MatchComputed {
        $key = $this->cacheKey($resumeText, $jobText);
        $cached = $this->readCache($key);
        if ($cached !== null) {
            return MatchComputed::fromArray($cached);
        }

        $matchResult = $this->hf->matchResumeToJob($resumeText, $jobText);
        $semanticSimilarity = (float) ($matchResult->result['similarity'] ?? 0.0);
        $matchSource = $matchResult->source;

        // Skills overlap: |resume ∩ job| / |job| (avoid div-by-zero).
        $resumeSet = array_map('strtolower', $resumeSkills);
        $jobSkillsLower = array_map('strtolower', $jobRequiredSkills);
        $matched = [];
        $missing = [];
        foreach ($jobRequiredSkills as $i => $raw) {
            $lower = $jobSkillsLower[$i];
            if (in_array($lower, $resumeSet, true)) {
                $matched[] = $raw;
            } else {
                $missing[] = $raw;
            }
        }
        $skillsOverlap = count($jobRequiredSkills) === 0
            ? 0.5 // neutral — neither perfect nor zero
            : count($matched) / count($jobRequiredSkills);

        $combined = 0.7 * $semanticSimilarity + 0.3 * $skillsOverlap;
        $matchPercentage = (int) round(max(0, min(1, $combined)) * 100);

        $computed = new MatchComputed(
            matchPercentage: $matchPercentage,
            matchSource: $matchSource,
            matchedSkills: $matched,
            missingSkills: $missing,
            semanticSimilarity: $semanticSimilarity,
            skillsOverlap: $skillsOverlap,
        );

        $this->writeCache($key, $computed->toArray(), $matchSource);

        return $computed;
    }

    /**
     * Background-match a resume against every active job.
     * Idempotent: deletes existing matches for this resume before re-inserting.
     *
     * @return int number of matches created
     */
    public function matchResumeAgainstAllJobs(Resume $resume): int
    {
        if (! $resume->extracted_text) {
            return 0;
        }
        $activeJobs = JobPost::active()->get();
        if ($activeJobs->isEmpty()) {
            return 0;
        }

        $resumeSkills = $resume->skills_list;

        DB::transaction(function () use ($resume) {
            JobMatch::where('resume_id', $resume->id)->delete();
        });

        $created = 0;
        foreach ($activeJobs as $job) {
            $computed = $this->computeMatch(
                $resume->extracted_text,
                $resumeSkills,
                "{$job->title}\n{$job->description}",
                $job->required_skills,
            );

            $match = JobMatch::create([
                'resume_id' => $resume->id,
                'job_post_id' => $job->id,
                'recruiter_id' => $job->recruiter_id,
                'match_percentage' => $computed->matchPercentage,
                'match_source' => $computed->matchSource,
                'matched_skills_json' => ['skills' => $computed->matchedSkills],
                'missing_skills_json' => ['skills' => $computed->missingSkills],
                'analyzed_at' => now(),
            ]);

            try {
                $this->notifications->notifyNewMatch($match);
            } catch (\Throwable $e) {
                Log::warning(json_encode([
                    'level' => 'warn', 'event' => 'match_notify_failed',
                    'matchId' => $match->id, 'error' => $e->getMessage(),
                ]));
            }
            $created++;
        }
        return $created;
    }

    /**
     * Background-match a job against every ready seeker resume.
     * Idempotent: deletes existing matches for this job before re-inserting.
     *
     * @return int number of matches created
     */
    public function matchJobAgainstAllResumes(JobPost $job): int
    {
        $jobSkills = $job->required_skills;
        $jobText = "{$job->title}\n{$job->description}";

        $readyResumes = Resume::ready()->get();
        if ($readyResumes->isEmpty()) {
            return 0;
        }

        DB::transaction(function () use ($job) {
            JobMatch::where('job_post_id', $job->id)->delete();
        });

        $created = 0;
        foreach ($readyResumes as $resume) {
            $computed = $this->computeMatch(
                $resume->extracted_text ?? '',
                $resume->skills_list,
                $jobText,
                $jobSkills,
            );

            $match = JobMatch::create([
                'resume_id' => $resume->id,
                'job_post_id' => $job->id,
                'recruiter_id' => $job->recruiter_id,
                'match_percentage' => $computed->matchPercentage,
                'match_source' => $computed->matchSource,
                'matched_skills_json' => ['skills' => $computed->matchedSkills],
                'missing_skills_json' => ['skills' => $computed->missingSkills],
                'analyzed_at' => now(),
            ]);

            try {
                $this->notifications->notifyNewMatch($match);
            } catch (\Throwable $e) {
                Log::warning(json_encode([
                    'level' => 'warn', 'event' => 'match_notify_failed',
                    'matchId' => $match->id, 'error' => $e->getMessage(),
                ]));
            }
            $created++;
        }
        return $created;
    }

    /**
     * Heuristic experience-year extractor (mirror of computeExperienceYears
     * in src/lib/ai/matcher.ts). Counts year ranges like "2020-2023",
     * "2020 - Present". Returns the total non-overlapping span (capped at 50).
     */
    public function computeExperienceYears(string $text): float
    {
        $present = '/\b(present|current|now|today)\b/i';
        $rangeRe = '/\b(19\d{2}|20\d{2})\s*(?:-|–|—|to)\s*((?:19\d{2}|20\d{2})|present|current|now|today)\b/i';

        $ranges = [];
        // PHP preg_match_all doesn't reset nicely with /g; use offset loop.
        $offset = 0;
        while (preg_match($rangeRe, $text, $m, PREG_OFFSET_CAPTURE, $offset)) {
            $start = (int) $m[1][0];
            $endRaw = strtolower($m[2][0]);
            $end = preg_match($present, $endRaw) ? (int) date('Y') : (int) $endRaw;
            if ($end >= $start && ($end - $start) < 60) {
                $ranges[] = ['start' => $start, 'end' => $end];
            }
            $offset = $m[0][1] + strlen($m[0][0]);
        }

        if (empty($ranges)) {
            return 0.0;
        }

        usort($ranges, fn($a, $b) => $a['start'] <=> $b['start']);
        $total = 0;
        $cursorEnd = -1;
        foreach ($ranges as $r) {
            if ($r['end'] <= $cursorEnd) continue;
            $start = max($r['start'], $cursorEnd);
            $total += $r['end'] - $start;
            $cursorEnd = $r['end'];
        }
        return min(50.0, round($total * 10) / 10);
    }

    private function cacheKey(string $resumeText, string $jobText): string
    {
        return md5("{$resumeText}\0{$jobText}");
    }

    private function readCache(string $key): ?array
    {
        /** @var \App\Models\AiCache|null $row */
        $row = \App\Models\AiCache::where('cache_key', $key)->first();
        if (! $row) return null;
        if ($row->isExpired()) {
            $row->delete();
            return null;
        }
        return is_array($row->result) ? $row->result : null;
    }

    private function writeCache(string $key, array $result, string $source): void
    {
        try {
            \App\Models\AiCache::updateOrCreate(
                ['cache_key' => $key],
                [
                    'result' => $result,
                    'source' => $source,
                    'expires_at' => now()->addSeconds((int) config('huggingface.cache_ttl_seconds', 604800)),
                ],
            );
        } catch (\Throwable $e) {
            Log::warning(json_encode([
                'level' => 'warn', 'event' => 'ai_cache_write_failed',
                'error' => $e->getMessage(),
            ]));
        }
    }
}
