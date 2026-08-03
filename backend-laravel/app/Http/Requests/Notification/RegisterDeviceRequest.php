<?php

namespace App\Http\Requests\Notification;

use Illuminate\Foundation\Http\FormRequest;

class RegisterDeviceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'deviceToken' => ['required', 'string', 'min:8', 'max:512'],
            'deviceType' => ['required', 'string', 'in:web,ios,android'],
            'browserInfo' => ['sometimes', 'string', 'max:255'],
        ];
    }
}
