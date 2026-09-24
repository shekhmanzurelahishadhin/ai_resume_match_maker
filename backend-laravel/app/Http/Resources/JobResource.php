<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A job post. `myMatch` / `myApplication` are seeker-specific extras the
 * controller attaches as attributes (they are never loaded for recruiters).
 */
class JobResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'company' => $this->company ?: $this->recruiter?->name,
            'location' => $this->location,
            'employmentType' => $this->employment_type,
            'workMode' => $this->work_mode,
            'experienceLevel' => $this->experience_level,
            'salaryRange' => $this->salary_range,
            'description' => $this->description,
            'requiredSkills' => $this->required_skills,
            'isActive' => (bool) $this->is_active,
            'recruiter' => $this->when($this->relationLoaded('recruiter'), fn () => [
                'id' => $this->recruiter?->id,
                'name' => $this->recruiter?->name,
            ]),
            'matchCount' => $this->when(
                isset($this->matches_count) || $this->relationLoaded('matches'),
                fn () => (int) ($this->matches_count ?? $this->matches->count()),
            ),
            'applicationCount' => $this->when(isset($this->applications_count), fn () => (int) $this->applications_count),
            'newApplicationCount' => $this->when(isset($this->new_applications_count), fn () => (int) $this->new_applications_count),
            'myMatch' => $this->when($this->resource->offsetExists('my_match'), fn () => $this->my_match),
            'myApplication' => $this->when($this->resource->offsetExists('my_application'), fn () => $this->my_application),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
