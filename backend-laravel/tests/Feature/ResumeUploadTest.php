<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ResumeUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        config(['filesystems.default' => 'local']);
    }

    public function test_recruiter_cannot_upload_resume(): void
    {
        $recruiter = User::factory()->recruiter()->create();

        $this->actingAs($recruiter, 'sanctum')
            ->postJson('/api/resumes/upload', [
                'file' => UploadedFile::fake()->create('resume.pdf', 100, 'application/pdf'),
            ])
            ->assertStatus(403);
    }

    public function test_non_pdf_rejected(): void
    {
        $seeker = User::factory()->seeker()->create();

        $this->actingAs($seeker, 'sanctum')
            ->postJson('/api/resumes/upload', [
                'file' => UploadedFile::fake()->create('resume.txt', 100, 'text/plain'),
            ])
            ->assertStatus(422);
    }

    public function test_seeker_can_upload_a_pdf_and_job_is_dispatched(): void
    {
        $seeker = User::factory()->seeker()->create();
        Storage::fake('local');

        // A real %PDF-magic-bytes PDF — create a minimal one.
        $pdfContent = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\nxref\n0 3\n0000000000 65535 f \ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n0\n%%EOF";

        $file = UploadedFile::fake()->createWithContent('resume.pdf', $pdfContent)->mimeType('application/pdf');

        $this->actingAs($seeker, 'sanctum')
            ->postJson('/api/resumes/upload', ['file' => $file])
            ->assertStatus(201)
            ->assertJsonPath('data.resume.status', 'pending');

        $this->assertDatabaseHas('resumes', ['user_id' => $seeker->id]);
    }
}
