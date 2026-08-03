<?php

namespace App\Http\Requests\GeneratedResume;

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
            'customizationJson' => ['sometimes', 'array'],
            'templateId' => ['sometimes', 'string', 'uuid'],
        ];
    }
}
