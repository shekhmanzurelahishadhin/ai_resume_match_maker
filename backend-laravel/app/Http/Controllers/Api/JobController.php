<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Job\StoreJobRequest;
use App\Http\Requests\Job\UpdateJobRequest;
use App\Http\Resources\CandidateResource;
use App\Http\Resources\JobResource;
use App\Jobs\MatchResumeAgainstJobs;
use App\Models\JobPost;
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

        $query = JobPost::with(['recruiter:id,name', 'matches'])
            ->when($search !== '', fn ($q) => $q->where('title', 'like', "%{$search}%"))
            ->orderByDesc('created_at');

        // Seekers see only active jobs; recruiters see their own.
        if ($user->isSeeker()) {
            $query->where('is_active', true);
        } else {
            $query->where('recruiter_id', $user->id);
        }

        $total = $query->count();
        $items = $query->skip(($page - 1) * $pageSize)->take($pageSize)->get();

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
        $data = $request->validated();
        $user = $request->user();

        $job = JobPost::create([
            'recruiter_id' => $user->id,
            'title' => trim($data['title']),
            'description' => trim($data['description']),
            'required_skills_json' => ['skills' => $data['requiredSkills'] ?? []],
            'is_active' => $data['isActive'] ?? true,
        ]);

        // Match the new job against every ready resume + notify seekers.
        MatchResumeAgainstJobs::dispatch($job->id);

        return $this->created(['job' => JobResource::make($job->fresh(['recruiter']))]);
    }

    public function show(Request $request, JobPost $job): JsonResponse
    {
        $this->authorize('view', $job);
        $job->load(['recruiter:id,name', 'matches']);
        return $this->ok(['job' => JobResource::make($job)]);
    }

    public function update(UpdateJobRequest $request, JobPost $job): JsonResponse
    {
        $this->authorize('update', $job);
        $data = $request->validated();

        $skillsChanged = false;
        if (isset($data['title'])) $job->title = trim($data['title']);
        if (isset($data['description'])) $job->description = trim($data['description']);
        if (isset($data['requiredSkills'])) {
            $job->required_skills_json = ['skills' => $data['requiredSkills']];
            $skillsChanged = true;
        }
        if (isset($data['isActive'])) $job->is_active = (bool) $data['isActive'];
        $job->save();

        // Re-run matching if skills changed.
        if ($skillsChanged) {
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

        $query = \App\Models\JobMatch::where('job_post_id', $job->id)
            ->where('match_percentage', '>=', $minPct)
            ->with(['resume.user:id,name', 'resume'])
            ->orderByDesc('match_percentage');
        $total = $query->count();
        $items = $query->skip(($page - 1) * $pageSize)->take($pageSize)->get();

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
