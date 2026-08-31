<?php

namespace App\Http\Controllers\Api;

use App\Enums\UserRole;
use App\Http\Controllers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\JobMatch;
use App\Models\JobPost;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Role-aware dashboard overview: headline stats plus the handful of recent
 * records the landing screen shows.
 *
 * This exists so the frontend never needs direct database access for the
 * overview page — the aggregates (counts, averages, maximums) are cheaper to
 * compute here than to assemble from several list endpoints client-side.
 */
class DashboardController extends Controller
{
    use ApiResponse;

    private const RECENT_LIMIT = 5;

    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return $this->ok(
            $user->role === UserRole::Recruiter
                ? $this->recruiterOverview($user)
                : $this->seekerOverview($user),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function recruiterOverview(User $user): array
    {
        $matches = JobMatch::where('recruiter_id', $user->id);

        $recentJobs = JobPost::where('recruiter_id', $user->id)
            ->withCount('matches')
            ->orderByDesc('created_at')
            ->limit(self::RECENT_LIMIT)
            ->get();

        return [
            'role' => UserRole::Recruiter->value,
            'stats' => [
                'jobCount' => JobPost::where('recruiter_id', $user->id)->count(),
                'activeJobCount' => JobPost::where('recruiter_id', $user->id)
                    ->where('is_active', true)
                    ->count(),
                'candidateCount' => (clone $matches)->count(),
                'topMatchPercentage' => round((float) ((clone $matches)->max('match_percentage') ?? 0), 2),
            ],
            'recentJobs' => $recentJobs->map(fn (JobPost $job) => [
                'id' => $job->id,
                'title' => $job->title,
                'isActive' => (bool) $job->is_active,
                'candidateCount' => (int) $job->matches_count,
                'createdAt' => $job->created_at?->toIso8601String(),
            ])->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function seekerOverview(User $user): array
    {
        $matches = JobMatch::whereHas('resume', fn ($q) => $q->where('user_id', $user->id));

        $recentResumes = Resume::where('user_id', $user->id)
            ->withCount('matches')
            ->orderByDesc('created_at')
            ->limit(self::RECENT_LIMIT)
            ->get();

        $topMatches = (clone $matches)
            ->with(['jobPost:id,title,recruiter_id', 'jobPost.recruiter:id,name'])
            ->orderByDesc('match_percentage')
            ->limit(self::RECENT_LIMIT)
            ->get();

        return [
            'role' => UserRole::Seeker->value,
            'stats' => [
                'resumeCount' => Resume::where('user_id', $user->id)->count(),
                'matchCount' => (clone $matches)->count(),
                'avgMatchPercentage' => round((float) ((clone $matches)->avg('match_percentage') ?? 0), 2),
            ],
            'recentResumes' => $recentResumes->map(fn (Resume $resume) => [
                'id' => $resume->id,
                'fileName' => $resume->file_name,
                'status' => $resume->status instanceof \BackedEnum
                    ? $resume->status->value
                    : (string) $resume->status,
                'matchCount' => (int) $resume->matches_count,
                'createdAt' => $resume->created_at?->toIso8601String(),
            ])->all(),
            'topMatches' => $topMatches->map(fn (JobMatch $match) => [
                'id' => $match->id,
                'matchPercentage' => (float) $match->match_percentage,
                'matchSource' => $match->match_source instanceof \BackedEnum
                    ? $match->match_source->value
                    : (string) $match->match_source,
                'analyzedAt' => $match->analyzed_at?->toIso8601String(),
                'jobPost' => [
                    'id' => $match->jobPost?->id,
                    'title' => $match->jobPost?->title,
                    'recruiterName' => $match->jobPost?->recruiter?->name,
                ],
            ])->all(),
        ];
    }
}
