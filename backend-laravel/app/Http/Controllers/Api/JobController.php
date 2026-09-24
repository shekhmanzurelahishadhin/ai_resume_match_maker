<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Enums\ApplicationStatus;
use App\Http\Requests\Job\JobRules;
use App\Http\Requests\Job\StoreJobRequest;
use App\Http\Requests\Job\UpdateJobRequest;
use App\Http\Resources\CandidateResource;
use App\Http\Resources\JobResource;
use App\Jobs\MatchResumeAgainstJobs;
use App\Models\Conversation;
use App\Models\JobApplication;
use App\Models\JobMatch;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        ['page' => $page, 'pageSize' => $pageSize] = $this->parsePagination($request, 15);
        $search = trim((string) $request->query('q', ''));

        $query = JobPost::query()
            ->with('recruiter:id,name')
            ->withCount('matches')
            ->when($search !== '', function ($q) use ($search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $q->where(fn ($w) => $w->where('title', 'like', $like)
                    ->orWhere('company', 'like', $like)
                    ->orWhere('location', 'like', $like)
                    ->orWhere('required_skills_json', 'like', $like));
            })
            ->when(in_array($request->query('workMode'), JobRules::WORK_MODES, true),
                fn ($q) => $q->where('work_mode', $request->query('workMode')))
            ->when(in_array($request->query('employmentType'), JobRules::EMPLOYMENT_TYPES, true),
                fn ($q) => $q->where('employment_type', $request->query('employmentType')))
            ->when(in_array($request->query('experienceLevel'), JobRules::EXPERIENCE_LEVELS, true),
                fn ($q) => $q->where('experience_level', $request->query('experienceLevel')));

        if ($user->isSeeker()) {
            // Seekers browse every active job, optionally best-match first.
            $query->where('is_active', true);
            if ($request->query('sort') === 'match') {
                $best = JobMatch::query()
                    ->join('resumes', 'resumes.id', '=', 'matches.resume_id')
                    ->where('resumes.user_id', $user->id)
                    ->groupBy('matches.job_post_id')
                    ->selectRaw('matches.job_post_id, MAX(matches.match_percentage) as best_pct');
                $query->leftJoinSub($best, 'best', 'best.job_post_id', '=', 'job_posts.id')
                    ->select('job_posts.*')
                    ->orderByRaw('best.best_pct IS NULL, best.best_pct DESC');
            }
            if ($request->boolean('applied')) {
                $query->whereHas('applications', fn ($q) => $q->where('seeker_id', $user->id));
            }
        } else {
            $query->where('recruiter_id', $user->id)->withCount(self::applicationCounts());
            if ($request->query('status') === 'active') {
                $query->where('is_active', true);
            } elseif ($request->query('status') === 'closed') {
                $query->where('is_active', false);
            }
        }
        $query->orderByDesc('job_posts.created_at');

        $total = (clone $query)->count();
        $items = $query->skip(($page - 1) * $pageSize)->take($pageSize)->get();

        if ($user->isSeeker()) {
            $this->attachSeekerContext($items, $user);
        }

        return $this->ok([
            'items' => JobResource::collection($items)->resolve(),
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
            'totalPages' => max(1, (int) ceil($total / $pageSize)),
        ]);
    }

    public function store(StoreJobRequest $request): JsonResponse
    {
        $job = JobPost::create(JobRules::toAttributes($request->validated()) + [
            'recruiter_id' => $request->user()->id,
            'is_active' => true,
        ]);

        // Match the new job against every ready resume + notify seekers.
        MatchResumeAgainstJobs::dispatch($job->id);

        return $this->created(['job' => JobResource::make($job->fresh(['recruiter']))]);
    }

    public function show(Request $request, JobPost $job): JsonResponse
    {
        $this->authorize('view', $job);
        $user = $request->user();
        $job->load('recruiter:id,name')->loadCount('matches');

        if ($user->id === $job->recruiter_id) {
            $job->loadCount(self::applicationCounts());
        } elseif ($user->isSeeker()) {
            $this->attachSeekerContext(collect([$job]), $user, detailed: true);
        }

        return $this->ok(['job' => JobResource::make($job)]);
    }

    /** Live applications (withdrawn ones excluded) and those not yet reviewed. */
    private static function applicationCounts(): array
    {
        return [
            'applications' => fn ($q) => $q->where('status', '!=', ApplicationStatus::Withdrawn->value),
            'applications as new_applications_count' => fn ($q) => $q->where('status', ApplicationStatus::Applied->value),
        ];
    }

    /**
     * Give each job the seeker's best match and their application, if any.
     *
     * @param  \Illuminate\Support\Collection<int, JobPost>  $jobs
     */
    private function attachSeekerContext($jobs, User $user, bool $detailed = false): void
    {
        $ids = $jobs->pluck('id')->all();
        if ($ids === []) {
            return;
        }

        $matches = JobMatch::whereIn('job_post_id', $ids)
            ->whereHas('resume', fn ($q) => $q->where('user_id', $user->id))
            ->with('resume:id,file_name')
            ->orderByDesc('match_percentage')
            ->get()
            ->unique('job_post_id')
            ->keyBy('job_post_id');

        $applications = JobApplication::whereIn('job_post_id', $ids)
            ->where('seeker_id', $user->id)
            ->get()
            ->keyBy('job_post_id');

        foreach ($jobs as $job) {
            $match = $matches->get($job->id);
            $job->setAttribute('my_match', $match ? array_filter([
                'matchPercentage' => (float) $match->match_percentage,
                'resumeId' => $match->resume_id,
                'resumeName' => $match->resume?->file_name,
                'matchedSkills' => $detailed ? $match->matched_skills : null,
                'missingSkills' => $detailed ? $match->missing_skills : null,
            ], fn ($v) => $v !== null) : null);

            $app = $applications->get($job->id);
            $job->setAttribute('my_application', $app ? [
                'id' => $app->id,
                'status' => $app->status->value,
                'statusLabel' => $app->status->label(),
                'appliedAt' => $app->created_at?->toIso8601String(),
            ] : null);
        }
    }

    public function update(UpdateJobRequest $request, JobPost $job): JsonResponse
    {
        $this->authorize('update', $job);
        $attrs = JobRules::toAttributes($request->validated());

        $before = $job->required_skills;
        $job->fill($attrs)->save();

        // Re-run matching if skills changed.
        if (array_key_exists('required_skills_json', $attrs) && $before !== $job->required_skills) {
            MatchResumeAgainstJobs::dispatch($job->id);
        }

        return $this->ok(['job' => JobResource::make($job->fresh(['recruiter']))]);
    }

    public function destroy(Request $request, JobPost $job): JsonResponse
    {
        $this->authorize('delete', $job);
        $job->delete();
        return $this->ok(['deleted' => true]);
    }

    public function candidates(Request $request, JobPost $job): JsonResponse
    {
        $this->authorize('viewCandidates', $job);
        ['page' => $page, 'pageSize' => $pageSize] = $this->parsePagination($request, 15);
        $minPct = (float) ($request->query('minMatch', 0) ?: 0);

        $search = trim((string) $request->query('q', ''));

        $query = JobMatch::where('job_post_id', $job->id)
            ->where('match_percentage', '>=', $minPct)
            ->when($search !== '', fn ($q) => $q->whereHas('resume.user',
                fn ($u) => $u->where('name', 'like', '%'.addcslashes($search, '%_\\').'%')))
            ->with(['resume.user:id,name', 'resume'])
            ->orderByDesc('match_percentage');
        $total = $query->count();
        $items = $query->skip(($page - 1) * $pageSize)->take($pageSize)->get();

        // Tell the recruiter who has already applied or been messaged.
        $seekerIds = $items->map(fn ($m) => $m->resume?->user_id)->filter()->unique()->values();
        $applications = JobApplication::where('job_post_id', $job->id)
            ->whereIn('seeker_id', $seekerIds)->get()->keyBy('seeker_id');
        $conversations = Conversation::where('recruiter_id', $job->recruiter_id)
            ->where('job_post_id', $job->id)
            ->whereIn('seeker_id', $seekerIds)->pluck('id', 'seeker_id');
        foreach ($items as $match) {
            $seekerId = $match->resume?->user_id;
            $app = $applications->get($seekerId);
            $match->setAttribute('application_info', $app ? [
                'id' => $app->id,
                'status' => $app->status->value,
                'statusLabel' => $app->status->label(),
            ] : null);
            $match->setAttribute('conversation_id', $conversations->get($seekerId));
        }

        return $this->ok([
            'job' => ['id' => $job->id, 'title' => $job->title],
            'items' => CandidateResource::collection($items)->resolve(),
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
            'totalPages' => max(1, (int) ceil($total / $pageSize)),
        ]);
    }
}
