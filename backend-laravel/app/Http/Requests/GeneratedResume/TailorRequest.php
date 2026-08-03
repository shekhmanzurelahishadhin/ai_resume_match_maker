<?php

namespace App\Http\Requests\GeneratedResume;

use Illuminate\Foundation\Http\FormRequest;

class TailorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'jobId' => ['required', 'string', 'uuid'],
            'sections' => ['sometimes', 'array'],
            'sections.*' => ['string', 'in:summary,experience,skills,projects'],
        ];
    }
}
