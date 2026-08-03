<?php

namespace App\Http\Requests\GeneratedResume;

use Illuminate\Foundation\Http\FormRequest;

class StoreGeneratedResumeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'originalResumeId' => ['sometimes', 'string', 'uuid'],
            'templateId' => ['required_without:templateSlug', 'string', 'uuid'],
            'templateSlug' => ['sometimes', 'string', 'in:modern-clean,professional-classic,creative,executive,technical,academic'],
            'contentJson' => ['sometimes', 'array'],
            'customizationJson' => ['sometimes', 'array'],
        ];
    }
}
