<?php

namespace App\Http\Requests\Resume;

use Illuminate\Foundation\Http\FormRequest;

class UploadResumeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $maxKb = (int) config('app.resume_max_size_kb', 5120);

        return [
            'file' => ['required', 'file', 'mimes:pdf', 'max:'.$maxKb],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'A PDF file is required.',
            'file.mimes' => 'Only PDF files are accepted.',
            'file.max' => 'File too large (max 5MB).',
        ];
    }
}
