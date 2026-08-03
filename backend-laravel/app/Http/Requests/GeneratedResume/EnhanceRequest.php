<?php

namespace App\Http\Requests\GeneratedResume;

use Illuminate\Foundation\Http\FormRequest;

class EnhanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'text' => ['required', 'string', 'min:1', 'max:2000'],
            'section' => ['sometimes', 'string', 'in:summary,bullet,description'],
        ];
    }
}
