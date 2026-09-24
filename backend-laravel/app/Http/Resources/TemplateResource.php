<?php

namespace App\Http\Resources;

use App\Services\ResumeTemplateRenderer;
use Illuminate\Http\Resources\Json\JsonResource;

class TemplateResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description,
            'previewImage' => $this->preview_image,
            'isActive' => (bool) $this->is_active,
            // The template's own theme, i.e. what "reset to default" restores.
            'defaults' => $this->when(
                isset(ResumeTemplateRenderer::TEMPLATES[$this->slug]),
                fn () => [
                    'primaryColor' => ResumeTemplateRenderer::TEMPLATES[$this->slug]['primary'],
                    'accentColor' => ResumeTemplateRenderer::TEMPLATES[$this->slug]['accent'],
                    'headingFont' => ResumeTemplateRenderer::TEMPLATES[$this->slug]['headingFont'],
                    'bodyFont' => ResumeTemplateRenderer::TEMPLATES[$this->slug]['bodyFont'],
                ],
            ),
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
