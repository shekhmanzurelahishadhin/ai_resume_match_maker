<?php

namespace App\Console\Commands;

use App\Models\ResumeTemplate;
use Illuminate\Console\Command;

class SeedTemplatesCommand extends Command
{
    protected $signature = 'templates:seed';
    protected $description = 'Seed the 6 resume templates (modern-clean, professional-classic, creative, executive, technical, academic).';

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

    public function handle(): int
    {
        $this->info('Seeding resume templates...');
        $created = 0;
        foreach (self::TEMPLATES as $t) {
            $model = ResumeTemplate::firstOrCreate(
                ['slug' => $t['slug']],
                [
                    'name' => $t['name'],
                    'description' => $t['description'],
                    'preview_image' => $t['preview_image'],
                    'is_active' => true,
                ],
            );
            if ($model->wasRecentlyCreated) {
                $created++;
                $this->line("  + {$t['slug']}");
            } else {
                $this->line("  = {$t['slug']} (exists)");
            }
        }
        $this->info("Done. {$created} new template(s) seeded; ".(count(self::TEMPLATES) - $created)." already existed.");
        return self::SUCCESS;
    }
}
