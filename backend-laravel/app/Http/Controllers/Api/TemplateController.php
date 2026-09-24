<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Resources\TemplateResource;
use App\Models\ResumeTemplate;
use App\Services\ResumeTemplateRenderer;
use Illuminate\Http\JsonResponse;

class TemplateController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $templates = ResumeTemplate::where('is_active', true)->orderBy('name')->get();

        return $this->ok([
            'items' => TemplateResource::collection($templates)->resolve(),
            // Theme options the builder can offer; anything else is rejected.
            'options' => [
                'fonts' => array_map(
                    fn (string $key, array $font) => ['key' => $key, 'label' => $font['label']],
                    array_keys(ResumeTemplateRenderer::FONTS),
                    ResumeTemplateRenderer::FONTS,
                ),
                'spacings' => ResumeTemplateRenderer::SPACINGS,
                'fontSizes' => ResumeTemplateRenderer::FONT_SIZES,
            ],
        ]);
    }

    /**
     * The template rendered with sample content — used for picker thumbnails,
     * so they always show exactly what the renderer produces.
     */
    public function sample(ResumeTemplateRenderer $renderer, string $slug): JsonResponse
    {
        if (! $renderer->isRenderable($slug)) {
            return $this->notFound('Template not found');
        }

        return $this->ok(['html' => $renderer->renderSample($slug)]);
    }

    public function show(string $slug): JsonResponse
    {
        $template = ResumeTemplate::where('slug', $slug)->orWhere('id', $slug)->first();
        if (! $template) {
            return $this->notFound('Template not found');
        }
        return $this->ok(['template' => TemplateResource::make($template)]);
    }
}
