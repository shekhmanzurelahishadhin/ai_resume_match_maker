<?php

namespace App\Http\Controllers\Api;

use App\Enums\ApplicationStatus;
use App\Http\Controllers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\Application\ApplyRequest;
use App\Http\Resources\ApplicationResource;
use App\Models\Conversation;
use App\Models\JobApplication;
use App\Models\JobMatch;
use App\Models\JobPost;
use App\Services\NotificationService;
use App\Services\ResumeTemplateRenderer;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

class ApplicationController extends Controller
{
    use ApiResponse;

    private const RELATIONS = ['jobPost.recruiter:id,name', 'resume:id,file_name', 'generatedResume:id,content_json'];

    public function __construct(private NotificationService $notifications) {}

    /**
     * Seekers get their own applications; recruiters get the applications to
     * their jobs (optionally one job / one status / a name search).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        ['page' => $page, 'pageSize' => $pageSize] = $this->parsePagination($request, 20);

        $query = JobApplication::query()->with(self::RELATIONS)->orderByDesc('created_at');

        if ($user->isSeeker()) {
            $query->where('seeker_id', $user->id);
        } else {
            $query->with('seeker:id,name,email')
                ->whereHas('jobPost', fn ($q) => $q->where('recruiter_id', $user->id));
            if ($jobId = $request->query('jobId')) {
                $query->where('job_post_id', $jobId);
            }
            $search = trim((string) $request->query('q', ''));
            if ($search !== '') {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $query->whereHas('seeker', fn ($q) => $q->where('name', 'like', $like));
            }
        }

        $status = $request->query('status');
        if (is_string($status) && ApplicationStatus::tryFrom($status)) {
            $query->where('status', $status);
        } elseif ($user->isRecruiter()) {
            // A withdrawn application is noise in the recruiter's pipeline.
            $query->where('status', '!=', ApplicationStatus::Withdrawn->value);
        }

        $total = (clone $query)->count();
        $items = $query->skip(($page - 1) * $pageSize)->take($pageSize)->get();
        $this->attachConversationIds($items);

        return $this->ok([
            'items' => ApplicationResource::collection($items)->resolve(),
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
            'totalPages' => max(1, (int) ceil($total / $pageSize)),
        ]);
    }

    public function show(Request $request, JobApplication $application): JsonResponse
    {
        $this->authorize('view', $application);
        $application->load(self::RELATIONS);
        if ($request->user()->id === $application->jobPost?->recruiter_id) {
            $application->load('seeker:id,name,email');
        }
        $this->attachConversationIds(collect([$application]));

        return $this->ok(['application' => ApplicationResource::make($application)]);
    }

    public function apply(ApplyRequest $request, JobPost $job): JsonResponse
    {
        $user = $request->user();
        if (! $job->is_active) {
            return $this->err('This job is no longer accepting applications.', 422, 'JOB_CLOSED');
        }
        $data = $request->validated();

        $existing = JobApplication::where('job_post_id', $job->id)->where('seeker_id', $user->id)->first();
        if ($existing && $existing->status !== ApplicationStatus::Withdrawn) {
            return $this->err('You have already applied to this job.', 409, 'ALREADY_APPLIED', [
                'applicationId' => $existing->id,
            ]);
        }

        $resumeId = $data['resumeId'] ?? null;
        $generatedId = $resumeId ? null : ($data['generatedResumeId'] ?? null);

        // Snapshot the score for the resume being sent, else the seeker's best.
        $match = JobMatch::where('job_post_id', $job->id)
            ->when(
                $resumeId,
                fn ($q) => $q->where('resume_id', $resumeId),
                fn ($q) => $q->whereHas('resume', fn ($r) => $r->where('user_id', $user->id)),
            )
            ->max('match_percentage');

        $attrs = [
            'resume_id' => $resumeId,
            'generated_resume_id' => $generatedId,
            'cover_letter' => filled($data['coverLetter'] ?? null) ? trim($data['coverLetter']) : null,
            'status' => ApplicationStatus::Applied,
            'match_percentage' => $match !== null ? round((float) $match, 2) : null,
            'status_changed_at' => now(),
        ];

        if ($existing) {
            // Re-applying after a withdrawal reuses the row (one per job).
            $existing->forceFill($attrs + ['created_at' => now()])->save();
            $application = $existing;
        } else {
            $application = JobApplication::create($attrs + [
                'job_post_id' => $job->id,
                'seeker_id' => $user->id,
            ]);
        }

        $this->notifications->notifyApplicationReceived($application->load(['jobPost', 'seeker']));
        $application->load(self::RELATIONS)->unsetRelation('seeker');

        return $this->created(['application' => ApplicationResource::make($application)]);
    }

    public function updateStatus(Request $request, JobApplication $application): JsonResponse
    {
        $this->authorize('updateStatus', $application);
        if ($application->status === ApplicationStatus::Withdrawn) {
            return $this->err('The candidate withdrew this application.', 422, 'APPLICATION_WITHDRAWN');
        }
        $data = $request->validate([
            'status' => ['required', Rule::in(ApplicationStatus::recruiterSettable())],
        ]);
        $status = ApplicationStatus::from($data['status']);

        if ($status !== $application->status) {
            $application->status = $status;
            $application->status_changed_at = now();
            $application->save();
            $this->notifications->notifyApplicationStatus($application->load('jobPost'));
        }

        $application->load([...self::RELATIONS, 'seeker:id,name,email']);
        $this->attachConversationIds(collect([$application]));

        return $this->ok(['application' => ApplicationResource::make($application)]);
    }

    public function withdraw(Request $request, JobApplication $application): JsonResponse
    {
        $this->authorize('withdraw', $application);
        if (in_array($application->status, [ApplicationStatus::Hired, ApplicationStatus::Withdrawn], true)) {
            return $this->err('This application can no longer be withdrawn.', 422, 'CANNOT_WITHDRAW');
        }
        $application->status = ApplicationStatus::Withdrawn;
        $application->status_changed_at = now();
        $application->save();

        $application->load(self::RELATIONS);

        return $this->ok(['application' => ApplicationResource::make($application)]);
    }

    /**
     * Download the resume attached to an application. The policy limits this
     * to the applicant and the job's recruiter.
     */
    public function resume(
        Request $request,
        JobApplication $application,
        StorageService $storage,
        ResumeTemplateRenderer $renderer,
    ): Response {
        $this->authorize('view', $application);
        $application->load(['resume', 'generatedResume.template', 'seeker:id,name']);
        $base = Str::slug($application->seeker?->name ?: 'candidate') ?: 'candidate';

        if ($resume = $application->resume) {
            $bytes = $storage->get($resume->file_path);
            if ($bytes === null) {
                return $this->notFound('The resume file is no longer available.');
            }
            $ext = pathinfo($resume->file_name, PATHINFO_EXTENSION) ?: 'pdf';

            return $this->download($bytes, $resume->mime_type ?: 'application/octet-stream', "{$base}-resume.{$ext}");
        }

        if ($generated = $application->generatedResume) {
            return $this->download($renderer->renderPdf($generated), 'application/pdf', "{$base}-resume.pdf");
        }

        return $this->notFound('The candidate removed the resume attached to this application.');
    }

    private function download(string $bytes, string $mime, string $fileName): Response
    {
        return response($bytes, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => sprintf('attachment; filename="%s"', $fileName),
            'Cache-Control' => 'no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** @param Collection<int, JobApplication> $apps */
    private function attachConversationIds(Collection $apps): void
    {
        foreach ($apps as $app) {
            $app->setAttribute('conversation_id', Conversation::where('job_post_id', $app->job_post_id)
                ->where('seeker_id', $app->seeker_id)
                ->where('recruiter_id', $app->jobPost?->recruiter_id)
                ->value('id'));
        }
    }
}
