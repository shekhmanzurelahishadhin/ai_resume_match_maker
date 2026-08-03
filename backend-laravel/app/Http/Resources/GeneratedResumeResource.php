<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class GeneratedResumeResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'template' => $this->when($this->relationLoaded('template'), fn () => [
                'id' => $this->template->id,
                'slug' => $this->template->slug,
                'name' => $this->template->name,
            ]),
            'originalResume' => $this->when($this->relationLoaded('originalResume'), fn () => $this->originalResume ? [
                'id' => $this->originalResume->id,
                'fileName' => $this->originalResume->file_name,
            ] : null),
            'version' => $this->version,
            'isCurrent' => (bool) $this->is_current,
            'contentJson' => $this->content_json,
            'customizationJson' => $this->customization_json,
            'filePathPdf' => $this->file_path_pdf,
            'filePathDocx' => $this->file_path_docx,
            'filePathHtml' => $this->file_path_html,
            'versionCount' => $this->when($this->relationLoaded('versions'), fn () => $this->versions->count()),
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }
}
