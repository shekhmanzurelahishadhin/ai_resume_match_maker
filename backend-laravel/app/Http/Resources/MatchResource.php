<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class MatchResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'resumeId' => $this->resume_id,
            'jobPostId' => $this->job_post_id,
            'recruiterId' => $this->recruiter_id,
            'matchPercentage' => (float) $this->match_percentage,
            'matchSource' => $this->match_source instanceof \App\Enums\MatchSource ? $this->match_source->value : (string) $this->match_source,
            'matchedSkills' => $this->matched_skills,
            'missingSkills' => $this->missing_skills,
            'analyzedAt' => $this->analyzed_at?->toIso8601String(),
            'createdAt' => $this->created_at?->toIso8601String(),
            'job' => $this->when($this->relationLoaded('jobPost'), fn () => [
                'id' => $this->jobPost->id,
                'title' => $this->jobPost->title,
                'recruiterName' => $this->jobPost->relationLoaded('recruiter')
                    ? $this->jobPost->recruiter?->name
                    : null,
            ]),
            'resume' => $this->when($this->relationLoaded('resume'), fn () => [
                'id' => $this->resume->id,
                'fileName' => $this->resume->file_name,
            ]),
        ];
    }
}
