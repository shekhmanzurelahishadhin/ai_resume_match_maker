<?php

namespace App\Http\Requests\Auth;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:1', 'max:120'],
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'max:128'],
            'role' => ['required', 'string', Rule::in([UserRole::Seeker->value, UserRole::Recruiter->value])],
        ];
    }

    public function messages(): array
    {
        return [
            'role.in' => 'Role must be one of: seeker, recruiter.',
        ];
    }
}
