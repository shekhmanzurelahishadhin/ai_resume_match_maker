<?php

namespace App\Http\Resources;

use App\Models\JobApplication;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin JobApplication
 *
 * The applicant's email is shown to the recruiter here (and only here): by
 * applying, the seeker chose to share it with that employer.
 */
class ApplicationResource extends JsonResource
{
    public function toArray($request): array
    {
        $job = $this->jobPost;
        $builderName = $this->generatedResume
            ? 'Builder resume · '.(data_get($this->generatedResume->content_json, 'contact.name') ?: 'Untitled')
            : null;

        return [
            'id' => $this->id,
            'status' => $this->status->value,
            'statusLabel' => $this->status->label(),
            'coverLetter' => $this->cover_letter,
            'matchPercentage' => $this->match_percentage,
            'appliedAt' => $this->created_at?->toIso8601String(),
            'statusChangedAt' => $this->status_changed_at?->toIso8601String(),
            'resume' => [
                'kind' => $this->resume_id ? 'upload' : ($this->generated_resume_id ? 'builder' : null),
                'name' => $this->resume?->file_name ?? $builderName,
                'available' => (bool) ($this->resume_id || $this->generated_resume_id),
            ],
            'job' => $job ? [
                'id' => $job->id,
                'title' => $job->title,
                'company' => $job->company ?: $job->recruiter?->name,
                'location' => $job->location,
                'isActive' => (bool) $job->is_active,
            ] : null,
            'candidate' => $this->when($this->relationLoaded('seeker'), fn () => [
                'id' => $this->seeker?->id,
                'name' => $this->seeker?->name,
                'email' => $this->seeker?->email,
            ]),
            'conversationId' => $this->getAttribute('conversation_id'),
        ];
    }
}
