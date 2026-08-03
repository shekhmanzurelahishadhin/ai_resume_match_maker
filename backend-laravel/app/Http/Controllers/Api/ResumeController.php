<?php

namespace App\Http\Controllers\Api;

use App\Enums\ResumeStatus;
use App\Http\Controllers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Resume\UploadResumeRequest;
use App\Http\Resources\MatchResource;
use App\Http\Resources\ResumeListResource;
use App\Http\Resources\ResumeResource;
use App\Jobs\ParseResumeAndMatch;
use App\Models\Resume;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ResumeController extends Controller
{
    use ApiResponse;

    public function __construct(private StorageService $storage) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        ['page' => $page, 'pageSize' => $pageSize] = $this->parsePagination($request, 15);

        $query = Resume::where('user_id', $user->id)->orderByDesc('created_at');
        $total = $query->count();
        $items = $query->skip(($page - 1) * $pageSize)->take($pageSize)->get();

        return $this->ok([
            'items' => ResumeListResource::collection($items)->resolve(),
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
            'totalPages' => max(1, (int) ceil($total / $pageSize)),
        ]);
    }

    public function upload(UploadResumeRequest $request): JsonResponse
    {
        $user = $request->user();
        $file = $request->file('file');

        // Validate magic bytes (%PDF).
        $contents = file_get_contents($file->getRealPath());
        if (! str_starts_with($contents, '%PDF')) {
            return $this->err('File does not appear to be a valid PDF', 415, 'INVALID_PDF');
        }

        $resume = DB::transaction(function () use ($user, $file, $contents) {
            $resume = Resume::create([
                'user_id' => $user->id,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => '', // placeholder; updated below
                'mime_type' => $file->getMimeType() ?: 'application/pdf',
                'file_size_bytes' => $file->getSize(),
                'status' => ResumeStatus::Pending->value,
            ]);

            $key = $this->storage->saveResumeUpload($contents, $user->id, $resume->id, $file->getClientOriginalName());
            $resume->file_path = $key;
            $resume->save();

            return $resume;
        });

        // Kick off parsing + matching on the queue.
        ParseResumeAndMatch::dispatch($resume->id);

        return $this->created(['resume' => ResumeResource::make($resume->fresh())]);
    }

    public function show(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('view', $resume);
        return $this->ok(['resume' => ResumeResource::make($resume)]);
    }

    public function destroy(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('delete', $resume);

        // Best-effort file deletion (storage failures don't block the row delete).
        if ($resume->file_path) {
            $this->storage->delete($resume->file_path);
        }
        $resume->delete();

        return $this->ok(['deleted' => true]);
    }

    public function status(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('view', $resume);
        return $this->ok([
            'status' => $resume->status instanceof ResumeStatus ? $resume->status->value : (string) $resume->status,
            'parseError' => $resume->parse_error,
            'skillsCount' => count($resume->skills_list),
            'experienceYears' => $resume->experience_years,
        ]);
    }

    public function matches(Request $request, Resume $resume): JsonResponse
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

    public function analyze(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('analyze', $resume);
        // Reset + re-dispatch the parse/match job.
        $resume->status = ResumeStatus::Pending->value;
        $resume->parse_error = null;
        $resume->save();
        ParseResumeAndMatch::dispatch($resume->id);
        return $this->ok(['status' => 'reanalyzing']);
    }
}
