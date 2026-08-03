<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\JobPost>
 */
class JobPostFactory extends Factory
{
    public function definition(): array
    {
        return [
            'recruiter_id' => User::factory()->recruiter(),
            'title' => fake()->jobTitle(),
            'description' => fake()->paragraphs(3, true),
            'required_skills_json' => ['skills' => ['JavaScript', 'React', 'Node.js']],
            'is_active' => true,
        ];
    }
}
