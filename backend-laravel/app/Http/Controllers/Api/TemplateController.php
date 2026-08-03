<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Http\Resources\TemplateResource;
use App\Models\ResumeTemplate;
use Illuminate\Http\JsonResponse;

class TemplateController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $templates = ResumeTemplate::where('is_active', true)->orderBy('name')->get();
        return $this->ok(['items' => TemplateResource::collection($templates)->resolve()]);
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
