<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Resources\CandidateResource;
use App\Http\Resources\MatchResource;
use App\Models\JobPost;
use App\Models\JobMatch;
use App\Models\Resume;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MatchController extends Controller
{
    use ApiResponse;

    public function show(Request $request, JobMatch $match): JsonResponse
    {
        $this->authorize('view', $match);
        $match->load(['resume.user:id,name', 'jobPost:id,title']);
        return $this->ok(['match' => MatchResource::make($match)]);
    }

    public function byResume(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('viewMatches', $resume);
        ['page' => $page, 'pageSize' => $pageSize] = $this->parsePagination($request, 15);

        $query = JobMatch::where('resume_id', $resume->id)
            ->with('jobPost:id,title')
            ->orderByDesc('match_percentage');
        $total = $query->count();
        $items = $query->skip(($page - 1) * $pageSize)->take($pageSize)->get();

        return $this->ok([
            'items' => MatchResource::collection($items)->resolve(),
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
            'totalPages' => max(1, (int) ceil($total / $pageSize)),
        ]);
    }

    public function byJob(Request $request, JobPost $job): JsonResponse
    {
        $this->authorize('viewCandidates', $job);
        ['page' => $page, 'pageSize' => $pageSize] = $this->parsePagination($request, 15);
        $minPct = (float) ($request->query('minMatch', 0) ?: 0);

        $query = JobMatch::where('job_post_id', $job->id)
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
