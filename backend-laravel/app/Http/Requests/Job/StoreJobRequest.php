<?php

namespace App\Http\Requests\Job;

use Illuminate\Foundation\Http\FormRequest;

class StoreJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:1', 'max:200'],
            'description' => ['required', 'string', 'min:1', 'max:8000'],
            'requiredSkills' => ['sometimes', 'array'],
            'requiredSkills.*' => ['string', 'max:80'],
            'isActive' => ['sometimes', 'boolean'],
        ];
    }
}
