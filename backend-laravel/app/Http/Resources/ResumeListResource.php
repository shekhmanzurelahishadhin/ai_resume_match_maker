<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Lightweight resume shape used in list endpoints (omits extracted_text
 * even from the seeker's own view for performance; the detail endpoint
 * returns ResumeResource).
 */
class ResumeListResource extends JsonResource
{
    public function toArray($request): array
    {
        $skills = is_array($this->skills_json) ? $this->skills_json : ['skills' => []];

        return [
            'id' => $this->id,
            'fileName' => $this->file_name,
            'fileSizeBytes' => $this->file_size_bytes,
            'skillsCount' => count($skills['skills'] ?? []),
            'experienceYears' => $this->experience_years,
            'status' => $this->status instanceof \App\Enums\ResumeStatus ? $this->status->value : (string) $this->status,
            'parseError' => $this->parse_error,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
