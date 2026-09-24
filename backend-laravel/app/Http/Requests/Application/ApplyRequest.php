<?php

namespace App\Http\Requests\Application;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ApplyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->user()->id;

        // Either an uploaded resume or a builder resume, and it must be the
        // applicant's own.
        return [
            'resumeId' => ['nullable', 'required_without:generatedResumeId', 'uuid',
                Rule::exists('resumes', 'id')->where('user_id', $userId)],
            'generatedResumeId' => ['nullable', 'required_without:resumeId', 'uuid',
                Rule::exists('generated_resumes', 'id')->where('user_id', $userId)],
            'coverLetter' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return [
            'resumeId.required_without' => 'Choose a resume to send with your application.',
            'generatedResumeId.required_without' => 'Choose a resume to send with your application.',
            'resumeId.exists' => 'That resume was not found.',
            'generatedResumeId.exists' => 'That resume was not found.',
        ];
    }
}
