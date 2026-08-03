<?php

namespace Database\Factories;

use App\Enums\ResumeStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Resume>
 */
class ResumeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'file_name' => 'resume.pdf',
            'file_path' => 'resumes/demo/demo/resume.pdf',
            'mime_type' => 'application/pdf',
            'file_size_bytes' => fake()->numberBetween(50000, 500000),
            'extracted_text' => fake()->paragraphs(5, true),
            'skills_json' => [
                'skills' => ['JavaScript', 'TypeScript', 'React', 'Node.js'],
                'categories' => [
                    'Technical' => ['JavaScript', 'TypeScript', 'React', 'Node.js'],
                    'Tools' => [],
                    'Soft Skills' => [],
                    'Domain' => [],
                    'Languages' => [],
                ],
            ],
            'experience_years' => fake()->randomFloat(1, 0, 15),
            'status' => ResumeStatus::Ready->value,
            'parse_error' => null,
        ];
    }
}
