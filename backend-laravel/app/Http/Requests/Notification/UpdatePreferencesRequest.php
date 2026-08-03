<?php

namespace App\Http\Requests\Notification;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'emailNotifications' => ['sometimes', 'boolean'],
            'pushNotifications' => ['sometimes', 'boolean'],
            'jobMatches' => ['sometimes', 'boolean'],
            'resumeAnalysis' => ['sometimes', 'boolean'],
            'newJobs' => ['sometimes', 'boolean'],
            'dailyDigest' => ['sometimes', 'boolean'],
        ];
    }
}
