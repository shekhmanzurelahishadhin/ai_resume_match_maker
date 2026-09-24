<?php

namespace App\Http\Requests\GeneratedResume;

use App\Services\ResumeTemplateRenderer;
use Illuminate\Foundation\Http\FormRequest;

class UpdateGeneratedResumeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'contentJson' => ['sometimes', 'array'],
            'templateId' => ['sometimes', 'string', 'uuid'],
            ...ResumeTemplateRenderer::customizationRules(),
        ];
    }
}
