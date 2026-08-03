<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ResumeVersionResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'generatedResumeId' => $this->generated_resume_id,
            'versionNumber' => $this->version_number,
            'contentJson' => $this->content_json,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
