<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ResumeResource extends JsonResource
{
    public function toArray($request): array
    {
        $skills = is_array($this->skills_json) ? $this->skills_json : ['skills' => [], 'categories' => []];

        return [
            'id' => $this->id,
            'userId' => $this->user_id,
            'fileName' => $this->file_name,
            'filePath' => $this->file_path,
            'mimeType' => $this->mime_type,
            'fileSizeBytes' => $this->file_size_bytes,
            'skills' => $skills['skills'] ?? [],
            'skillCategories' => $skills['categories'] ?? [],
            // Whether the AI path or the deterministic fallback produced these.
            'skillsSource' => $skills['_source'] ?? 'fallback',
            'experienceYears' => $this->experience_years,
            'status' => $this->status instanceof \App\Enums\ResumeStatus ? $this->status->value : (string) $this->status,
            'parseError' => $this->parse_error,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
