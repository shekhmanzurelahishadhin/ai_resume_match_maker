<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Resources\ResumeResource;
use App\Http\Resources\UserResource;
use App\Models\DeviceToken;
use App\Models\GeneratedResume;
use App\Models\JobPost;
use App\Models\JobMatch;
use App\Models\Notification;
use App\Models\NotificationPreference;
use App\Models\Resume;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    use ApiResponse;

    public function show(Request $request): JsonResponse
    {
        return $this->ok(['user' => UserResource::make($request->user())]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'min:1', 'max:120'],
            'password' => ['sometimes', 'string', 'min:8', 'max:128'],
        ]);

        $user = $request->user();
        if (isset($data['name'])) {
            $user->name = trim($data['name']);
        }
        if (isset($data['password'])) {
            $user->password_hash = Hash::make($data['password']);
        }
        $user->save();

        return $this->ok(['user' => UserResource::make($user)]);
    }

    /**
     * Soft-delete the user (§5: 30-day retention; hard purge via
     * `php artisan users:purge-deleted`). Cascades to all related tables.
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();

        // Revoke all tokens immediately.
        $user->tokens()->delete();

        // Soft delete (cascade configured on FKs for hard cleanup later).
        $user->delete();

        return $this->ok(['deleted' => true]);
    }

    /**
     * GDPR-style data export (§5). Returns a JSON document with all of the
     * user's data: profile, resumes, jobs, matches, generated resumes,
     * notifications, device tokens, preferences.
     */
    public function exportData(Request $request): JsonResponse
    {
        $user = $request->user();

        $profile = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role instanceof \App\Enums\UserRole ? $user->role->value : (string) $user->role,
            'createdAt' => $user->created_at?->toIso8601String(),
            'updatedAt' => $user->updated_at?->toIso8601String(),
        ];

        $resumes = Resume::where('user_id', $user->id)->orderByDesc('created_at')->get()
            ->map(fn (Resume $r) => ResumeResource::make($r)->toArray(request()));

        $jobs = JobPost::where('recruiter_id', $user->id)->orderByDesc('created_at')->get()
            ->map(fn (JobPost $j) => [
                'id' => $j->id,
                'title' => $j->title,
                'description' => $j->description,
                'requiredSkills' => $j->required_skills,
                'isActive' => (bool) $j->is_active,
                'createdAt' => $j->created_at?->toIso8601String(),
            ]);

        $matchesAsSeeker = JobMatch::whereHas('resume', fn ($q) => $q->where('user_id', $user->id))
            ->with('jobPost:id,title')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (JobMatch $m) => [
                'id' => $m->id,
                'matchPercentage' => $m->match_percentage,
                'matchSource' => (string) $m->match_source,
                'matchedSkills' => $m->matched_skills,
                'missingSkills' => $m->missing_skills,
                'analyzedAt' => $m->analyzed_at?->toIso8601String(),
                'job' => ['id' => $m->jobPost->id ?? null, 'title' => $m->jobPost->title ?? null],
            ]);

        $matchesAsRecruiter = JobMatch::where('recruiter_id', $user->id)
            ->with(['resume.user:id,name', 'jobPost:id,title'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (JobMatch $m) => [
                'id' => $m->id,
                'matchPercentage' => $m->match_percentage,
                'matchSource' => (string) $m->match_source,
                'matchedSkills' => $m->matched_skills,
                'missingSkills' => $m->missing_skills,
                'analyzedAt' => $m->analyzed_at?->toIso8601String(),
                'job' => ['id' => $m->jobPost->id ?? null, 'title' => $m->jobPost->title ?? null],
                'candidate' => ['id' => $m->resume->user->id ?? null, 'name' => $m->resume->user->name ?? null],
            ]);

        $generated = GeneratedResume::where('user_id', $user->id)->orderByDesc('updated_at')->get()
            ->map(fn (GeneratedResume $g) => [
                'id' => $g->id,
                'version' => $g->version,
                'isCurrent' => (bool) $g->is_current,
                'contentJson' => $g->content_json,
                'customizationJson' => $g->customization_json,
                'createdAt' => $g->created_at?->toIso8601String(),
                'updatedAt' => $g->updated_at?->toIso8601String(),
            ]);

        $notifications = Notification::where('user_id', $user->id)->orderByDesc('created_at')->limit(500)->get()
            ->map(fn (Notification $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'title' => $n->title,
                'body' => $n->body,
                'isRead' => (bool) $n->is_read,
                'createdAt' => $n->created_at?->toIso8601String(),
            ]);

        $deviceTokens = DeviceToken::where('user_id', $user->id)->get()
            ->map(fn (DeviceToken $t) => [
                'id' => $t->id,
                'deviceType' => $t->device_type,
                'browserInfo' => $t->browser_info,
                'isActive' => (bool) $t->is_active,
                'lastUsedAt' => $t->last_used_at?->toIso8601String(),
                'createdAt' => $t->created_at?->toIso8601String(),
            ]);

        $prefs = NotificationPreference::where('user_id', $user->id)->first();

        return $this->ok([
            'exportedAt' => now()->toIso8601String(),
            'profile' => $profile,
            'resumes' => $resumes,
            'jobs' => $jobs,
            'matchesAsSeeker' => $matchesAsSeeker,
            'matchesAsRecruiter' => $matchesAsRecruiter,
            'generatedResumes' => $generated,
            'notifications' => $notifications,
            'deviceTokens' => $deviceTokens,
            'notificationPreferences' => $prefs,
        ]);
    }
}
