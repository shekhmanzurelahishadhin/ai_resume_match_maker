<?php

namespace Tests\Feature;

use App\Models\GeneratedResume;
use App\Models\ResumeTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GeneratedResumeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed a template so the store endpoint can resolve it.
        ResumeTemplate::create([
            'slug' => 'modern-clean',
            'name' => 'Modern Clean',
            'description' => 'test',
            'is_active' => true,
        ]);
    }

    public function test_user_can_create_a_generated_resume(): void
    {
        $user = User::factory()->create();
        $template = ResumeTemplate::first();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/resumes/generate', [
                'templateId' => $template->id,
                'contentJson' => [
                    'contact' => ['name' => 'Jane Doe', 'email' => 'jane@example.com'],
                    'summary' => 'Engineer.',
                    'experience' => [],
                    'education' => [],
                    'skills' => [],
                    'projects' => [],
                    'certifications' => [],
                ],
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.resume.version', 1);

        $this->assertDatabaseHas('generated_resumes', ['user_id' => $user->id]);
        $this->assertDatabaseHas('resume_versions', ['version_number' => 1]);
    }

    public function test_owner_can_preview_their_generated_resume(): void
    {
        $user = User::factory()->create();
        $template = ResumeTemplate::first();
        $gen = GeneratedResume::create([
            'user_id' => $user->id,
            'template_id' => $template->id,
            'content_json' => [
                'contact' => ['name' => 'Jane Doe'],
                'summary' => '',
                'experience' => [],
                'education' => [],
                'skills' => [],
                'projects' => [],
                'certifications' => [],
            ],
            'version' => 1,
            'is_current' => true,
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/resumes/generate/{$gen->id}/preview")
            ->assertStatus(200)
            ->assertJsonStructure(['data' => ['html']]);
    }

    public function test_non_owner_cannot_view_generated_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $template = ResumeTemplate::first();
        $gen = GeneratedResume::create([
            'user_id' => $owner->id,
            'template_id' => $template->id,
            'content_json' => [],
            'version' => 1,
            'is_current' => true,
        ]);

        $this->actingAs($other, 'sanctum')
            ->getJson("/api/resumes/generate/{$gen->id}")
            ->assertStatus(403);
    }
}
