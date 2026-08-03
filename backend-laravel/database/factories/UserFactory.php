<?php

namespace Database\Factories;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password_hash' => Hash::make('password123'),
            'role' => fake()->randomElement([UserRole::Seeker->value, UserRole::Recruiter->value]),
            'remember_token' => Str::random(10),
        ];
    }

    public function seeker(): self
    {
        return $this->state(fn (array $attrs) => ['role' => UserRole::Seeker->value]);
    }

    public function recruiter(): self
    {
        return $this->state(fn (array $attrs) => ['role' => UserRole::Recruiter->value]);
    }
}
