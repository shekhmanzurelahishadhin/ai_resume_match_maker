<?php

namespace App\Http\Requests\GeneratedResume;

use Illuminate\Foundation\Http\FormRequest;

class ExportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'format' => ['required', 'string', 'in:html,pdf,docx'],
        ];
    }
}
