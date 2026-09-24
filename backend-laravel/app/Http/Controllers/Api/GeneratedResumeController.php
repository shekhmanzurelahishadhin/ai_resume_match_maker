<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Requests\GeneratedResume\EnhanceRequest;
use App\Http\Requests\GeneratedResume\ExportRequest;
use App\Http\Requests\GeneratedResume\StoreGeneratedResumeRequest;
use App\Http\Requests\GeneratedResume\TailorRequest;
use App\Http\Requests\GeneratedResume\UpdateGeneratedResumeRequest;
use App\Http\Resources\GeneratedResumeResource;
use App\Http\Resources\ResumeVersionResource;
use App\Models\GeneratedResume;
use App\Models\ResumeTemplate;
use App\Models\ResumeVersion;
use App\Services\Contracts\AiService;
use App\Services\ResumeTemplateRenderer;
use App\Services\StorageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class GeneratedResumeController extends Controller
{
    use ApiResponse;

    public function __construct(
        private ResumeTemplateRenderer $renderer,
        private StorageService $storage,
        private AiService $ai,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $items = GeneratedResume::where('user_id', $request->user()->id)
            ->where('is_current', true)
            ->with(['template:id,slug,name', 'originalResume:id,file_name', 'versions'])
            ->orderByDesc('updated_at')
            ->get();

        return $this->ok([
            'items' => GeneratedResumeResource::collection($items)->resolve(),
            'total' => $items->count(),
        ]);
    }

    public function store(StoreGeneratedResumeRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $request->user();

        // Resolve the template.
        $template = null;
        if (! empty($data['templateId'])) {
            $template = ResumeTemplate::where('id', $data['templateId'])->first();
        } elseif (! empty($data['templateSlug'])) {
            $template = ResumeTemplate::where('slug', $data['templateSlug'])->first();
        }
        if (! $template || ! $template->is_active) {
            return $this->notFound('Template not found');
        }
        if (! $this->renderer->isRenderable($template)) {
            return $this->err("Template '{$template->slug}' has no renderer", 500, 'TEMPLATE_RENDERER_MISSING');
        }

        // Resolve the original resume (optional — used to prefill content).
        $originalResume = null;
        if (! empty($data['originalResumeId'])) {
            $originalResume = \App\Models\Resume::where('id', $data['originalResumeId'])
                ->where('user_id', $user->id)
                ->first();
            if (! $originalResume) {
                return $this->notFound('Original resume not found');
            }
        }

        // Build the effective content.
        $content = $data['contentJson'] ?? $this->emptyContent();
        if (empty($data['contentJson']) && $originalResume) {
            $content = $this->contentFromResume($originalResume);
        }
        $customization = $data['customizationJson'] ?? [];

        $gen = DB::transaction(function () use ($user, $originalResume, $template, $content, $customization) {
            $gen = GeneratedResume::create([
                'user_id' => $user->id,
                'original_resume_id' => $originalResume?->id,
                'template_id' => $template->id,
                'content_json' => $content,
                'customization_json' => $customization,
                'version' => 1,
                'is_current' => true,
            ]);
            ResumeVersion::create([
                'generated_resume_id' => $gen->id,
                'version_number' => 1,
                'content_json' => $content,
            ]);
            return $gen;
        });

        return $this->created(['resume' => GeneratedResumeResource::make($gen->fresh(['template', 'originalResume', 'versions']))]);
    }

    public function show(Request $request, GeneratedResume $generatedResume): JsonResponse
    {
        $this->authorize('view', $generatedResume);
        $generatedResume->load(['template:id,slug,name', 'originalResume:id,file_name', 'versions']);
        return $this->ok(['resume' => GeneratedResumeResource::make($generatedResume)]);
    }

    public function update(UpdateGeneratedResumeRequest $request, GeneratedResume $generatedResume): JsonResponse
    {
        $this->authorize('update', $generatedResume);
        $data = $request->validated();

        $contentChanged = false;
        if (isset($data['contentJson'])) {
            $generatedResume->content_json = $data['contentJson'];
            $contentChanged = true;
        }
        if (isset($data['customizationJson'])) {
            $generatedResume->customization_json = $data['customizationJson'];
        }
        if (isset($data['templateId'])) {
            $template = ResumeTemplate::where('id', $data['templateId'])->first();
            if (! $template) return $this->notFound('Template not found');
            $generatedResume->template_id = $template->id;
        }
        $generatedResume->save();

        // Snapshot a new version when content changed.
        if ($contentChanged) {
            $nextVersion = ($generatedResume->version ?? 1) + 1;
            $generatedResume->version = $nextVersion;
            $generatedResume->save();
            ResumeVersion::create([
                'generated_resume_id' => $generatedResume->id,
                'version_number' => $nextVersion,
                'content_json' => $generatedResume->content_json,
            ]);
        }

        return $this->ok(['resume' => GeneratedResumeResource::make($generatedResume->fresh(['template', 'originalResume', 'versions']))]);
    }

    public function destroy(Request $request, GeneratedResume $generatedResume): JsonResponse
    {
        $this->authorize('delete', $generatedResume);

        // Best-effort delete exported files.
        foreach ([$generatedResume->file_path_pdf, $generatedResume->file_path_docx, $generatedResume->file_path_html] as $path) {
            if ($path) $this->storage->delete($path);
        }
        $generatedResume->delete();

        return $this->ok(['deleted' => true]);
    }

    public function preview(Request $request, GeneratedResume $generatedResume): JsonResponse
    {
        $this->authorize('view', $generatedResume);
        $html = $this->renderer->renderHtml($generatedResume->template, $generatedResume->content_json ?? [], $generatedResume->customization_json ?? []);
        return $this->ok(['html' => $html]);
    }

    /**
     * Render the resume and send it back as a file download. The copy kept in
     * private storage is never exposed by URL; the local disk has no signed
     * URLs, and a public link would leak other users' resumes.
     */
    public function export(ExportRequest $request, GeneratedResume $generatedResume): Response
    {
        $this->authorize('export', $generatedResume);
        $format = $request->validated()['format'];

        $bytes = match ($format) {
            'html' => $this->renderer->renderHtml($generatedResume->template, $generatedResume->content_json ?? [], $generatedResume->customization_json ?? []),
            'pdf' => $this->renderer->renderPdf($generatedResume),
            'docx' => $this->renderer->renderDocx($generatedResume),
        };

        $key = $this->storage->generatedResumeKey($generatedResume->user_id, $generatedResume->id, $format);
        $this->storage->saveContent($key, $bytes);

        $column = match ($format) {
            'html' => 'file_path_html',
            'pdf' => 'file_path_pdf',
            'docx' => 'file_path_docx',
        };
        $generatedResume->{$column} = $key;
        $generatedResume->save();

        $mime = match ($format) {
            'html' => 'text/html; charset=UTF-8',
            'pdf' => 'application/pdf',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
        $name = Str::slug(data_get($generatedResume->content_json, 'contact.name') ?: 'resume') ?: 'resume';

        return response($bytes, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => sprintf('attachment; filename="%s-resume.%s"', $name, $format),
            'Cache-Control' => 'no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function enhance(EnhanceRequest $request, GeneratedResume $generatedResume, AiService $hf): JsonResponse
    {
        $this->authorize('enhance', $generatedResume);
        $text = $request->validated()['text'];
        $result = $hf->enhanceBullet($text);

        // Persist as an improvement record only if there's a real original resume
        // (ResumeImprovement.resume_id has a FK constraint to resumes.id).
        if ($generatedResume->original_resume_id) {
            \App\Models\ResumeImprovement::create([
                'resume_id' => $generatedResume->original_resume_id,
                'original_text' => $text,
                'improved_text' => $result->result,
                'suggestion_type' => 'enhancement',
                'source' => $result->source,
            ]);
        }

        return $this->ok([
            'original' => $text,
            'improved' => $result->result,
            'source' => $result->source,
        ]);
    }

    public function tailor(TailorRequest $request, GeneratedResume $generatedResume, AiService $hf): JsonResponse
    {
        $this->authorize('tailor', $generatedResume);
        $jobId = $request->validated()['jobId'];
        $job = \App\Models\JobPost::where('id', $jobId)->first();
        if (! $job) {
            return $this->notFound('Job not found');
        }

        $content = $generatedResume->content_json ?? [];
        $skills = is_array($content) ? ($content['skills'] ?? []) : [];
        $skillLabels = [];
        foreach ($skills as $group) {
            foreach (($group['items'] ?? []) as $item) {
                $skillLabels[] = $item;
            }
        }

        // AI summary tailored to the job; fallback uses template summary.
        $summaryResult = $hf->generateSummary(
            $job->title,
            $skillLabels,
            (int) ($content['experienceYears'] ?? 0),
        );

        $content['summary'] = $summaryResult->result;

        // Snapshot a new version.
        $nextVersion = ($generatedResume->version ?? 1) + 1;
        $generatedResume->content_json = $content;
        $generatedResume->version = $nextVersion;
        $generatedResume->save();
        ResumeVersion::create([
            'generated_resume_id' => $generatedResume->id,
            'version_number' => $nextVersion,
            'content_json' => $content,
        ]);

        return $this->ok([
            'summary' => $summaryResult->result,
            'source' => $summaryResult->source,
            'version' => $nextVersion,
        ]);
    }

    public function versions(Request $request, GeneratedResume $generatedResume): JsonResponse
    {
        $this->authorize('viewVersions', $generatedResume);
        $versions = ResumeVersion::where('generated_resume_id', $generatedResume->id)
            ->orderByDesc('version_number')
            ->get();
        return $this->ok(['items' => ResumeVersionResource::collection($versions)->resolve()]);
    }

    public function restore(Request $request, GeneratedResume $generatedResume, int $version): JsonResponse
    {
        $this->authorize('restore', $generatedResume);
        $target = ResumeVersion::where('generated_resume_id', $generatedResume->id)
            ->where('version_number', $version)
            ->first();
        if (! $target) {
            return $this->notFound("Version {$version} not found");
        }

        // Snapshot current as a new version first.
        $nextVersion = ($generatedResume->version ?? 1) + 1;
        ResumeVersion::create([
            'generated_resume_id' => $generatedResume->id,
            'version_number' => $nextVersion,
            'content_json' => $generatedResume->content_json,
        ]);

        // Apply the target version's content.
        $generatedResume->content_json = $target->content_json;
        $generatedResume->version = $nextVersion;
        $generatedResume->save();

        return $this->ok([
            'restoredFromVersion' => $version,
            'currentVersion' => $nextVersion,
            'resume' => GeneratedResumeResource::make($generatedResume->fresh(['template', 'originalResume', 'versions'])),
        ]);
    }

    // ---------- helpers ----------

    private function emptyContent(): array
    {
        return [
            'contact' => ['name' => '', 'email' => '', 'phone' => '', 'location' => '', 'website' => '', 'linkedin' => '', 'github' => ''],
            'summary' => '',
            'experience' => [],
            'education' => [],
            'skills' => [],
            'projects' => [],
            'certifications' => [],
        ];
    }

    /**
     * Prefill builder content from an uploaded resume.
     *
     * Skills come from the row (already extracted at upload time); everything
     * else is parsed out of the stored text by the AI provider, falling back to
     * a heuristic section parse when no provider is configured.
     */
    private function contentFromResume(\App\Models\Resume $resume): array
    {
        $skillsJson = is_array($resume->skills_json) ? $resume->skills_json : ['skills' => [], 'categories' => []];
        $categories = $skillsJson['categories'] ?? [];
        $skillGroups = [];
        foreach ($categories as $cat => $items) {
            if (is_array($items) && ! empty($items)) {
                $skillGroups[] = ['category' => $cat, 'items' => $items];
            }
        }

        $parsed = $this->ai->extractResumeContent((string) $resume->extracted_text);
        $content = $parsed->result;

        // Fall back to the account details when the resume text has no contact
        // block of its own.
        $contact = $content['contact'] ?? [];
        if (($contact['name'] ?? '') === '') {
            $contact['name'] = $resume->user?->name ?? '';
        }
        if (($contact['email'] ?? '') === '') {
            $contact['email'] = $resume->user?->email ?? '';
        }

        return [
            'contact' => $contact,
            'summary' => $content['summary'] ?? '',
            'experience' => $content['experience'] ?? [],
            'education' => $content['education'] ?? [],
            'skills' => $skillGroups,
            'projects' => $content['projects'] ?? [],
            'certifications' => $content['certifications'] ?? [],
            'experienceYears' => $resume->experience_years ?? 0,
            '_contentSource' => $parsed->source,
        ];
    }
}
