<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_sixth_upload_in_an_hour_is_rejected(): void
    {
        $seeker = User::factory()->seeker()->create();
        Storage::fake('local');
        config(['filesystems.default' => 'local']);

        $pdfContent = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\nxref\n0 3\n0000000000 65535 f \ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n0\n%%EOF";

        // The first 5 should succeed (201) — but our rate limiter uses the DB
        // and persists across requests in the test env. We mock 5 uploads then
        // expect a 429 on the 6th.
        for ($i = 1; $i <= 5; $i++) {
            $file = UploadedFile::fake()->createWithContent("resume-{$i}.pdf", $pdfContent)->mimeType('application/pdf');
            $this->actingAs($seeker, 'sanctum')
                ->postJson('/api/resumes/upload', ['file' => $file])
                ->assertStatus(201);
        }

        $sixth = UploadedFile::fake()->createWithContent('resume-6.pdf', $pdfContent)->mimeType('application/pdf');
        $this->actingAs($seeker, 'sanctum')
            ->postJson('/api/resumes/upload', ['file' => $sixth])
            ->assertStatus(429)
            ->assertJsonPath('error.code', 'RATE_LIMITED');
    }
}
