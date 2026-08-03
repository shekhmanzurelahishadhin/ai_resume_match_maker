<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class JobResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'requiredSkills' => $this->required_skills,
            'isActive' => (bool) $this->is_active,
            'recruiter' => $this->when($this->relationLoaded('recruiter'), fn () => [
                'id' => $this->recruiter->id,
                'name' => $this->recruiter->name,
            ]),
            'matchCount' => $this->when($this->relationLoaded('matches'), fn () => $this->matches->count()),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
