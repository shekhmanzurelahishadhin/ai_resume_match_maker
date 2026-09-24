<?php

namespace Database\Seeders;

use App\Models\ResumeTemplate;
use App\Services\ResumeTemplateRenderer;
use Illuminate\Database\Seeder;

/**
 * One row per template the renderer can draw.
 *
 * Names and descriptions come from ResumeTemplateRenderer::TEMPLATES so the
 * database and the Blade views cannot drift apart. updateOrCreate (not
 * firstOrCreate) so re-running the seeder refreshes descriptions after a
 * template is redesigned.
 */
class ResumeTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach (ResumeTemplateRenderer::TEMPLATES as $slug => $template) {
            ResumeTemplate::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $template['name'],
                    'description' => $template['description'],
                    'preview_image' => "/templates/{$slug}.png",
                    'is_active' => true,
                ],
            );
        }
    }
}
