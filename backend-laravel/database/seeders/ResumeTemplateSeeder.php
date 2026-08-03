<?php

namespace Database\Seeders;

use App\Models\ResumeTemplate;
use Illuminate\Database\Seeder;

class ResumeTemplateSeeder extends Seeder
{
    private const TEMPLATES = [
        [
            'slug' => 'modern-clean',
            'name' => 'Modern Clean',
            'description' => 'Modern Clean — Minimalist single-column with clear typography hierarchy',
            'preview_image' => '/templates/modern-clean.png',
        ],
        [
            'slug' => 'professional-classic',
            'name' => 'Professional Classic',
            'description' => 'Professional Classic — Traditional serif, two-column with sidebar',
            'preview_image' => '/templates/professional-classic.png',
        ],
        [
            'slug' => 'creative',
            'name' => 'Creative',
            'description' => 'Creative — Bold accents and asymmetric layout for design roles',
            'preview_image' => '/templates/creative.png',
        ],
        [
            'slug' => 'executive',
            'name' => 'Executive',
            'description' => 'Executive — Compact, dense, executive-level format with summary on top',
            'preview_image' => '/templates/executive.png',
        ],
        [
            'slug' => 'technical',
            'name' => 'Technical',
            'description' => 'Technical — Skills-forward layout emphasizing tech stack',
            'preview_image' => '/templates/technical.png',
        ],
        [
            'slug' => 'academic',
            'name' => 'Academic',
            'description' => 'Academic — Citation-friendly format for researchers and academics',
            'preview_image' => '/templates/academic.png',
        ],
    ];

    public function run(): void
    {
        foreach (self::TEMPLATES as $t) {
            ResumeTemplate::firstOrCreate(
                ['slug' => $t['slug']],
                [
                    'name' => $t['name'],
                    'description' => $t['description'],
                    'preview_image' => $t['preview_image'],
                    'is_active' => true,
                ],
            );
        }
    }
}
