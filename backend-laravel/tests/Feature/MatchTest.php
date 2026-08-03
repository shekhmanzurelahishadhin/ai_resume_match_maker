<?php

namespace Tests\Feature;

use App\Models\JobPost;
use App\Models\JobMatch;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeker_can_fetch_their_resume_matches(): void
    {
        $seeker = User::factory()->seeker()->create();
        $recruiter = User::factory()->recruiter()->create();
        $resume = Resume::factory()->for($seeker, 'user')->create();
        $job = JobPost::factory()->for($recruiter, 'recruiter')->create();

        JobMatch::create([
            'resume_id' => $resume->id,
            'job_post_id' => $job->id,
            'recruiter_id' => $recruiter->id,
            'match_percentage' => 82.5,
            'match_source' => 'fallback',
            'matched_skills_json' => ['skills' => ['Laravel']],
            'missing_skills_json' => ['skills' => ['Vue']],
            'analyzed_at' => now(),
        ]);

        $this->actingAs($seeker, 'sanctum')
            ->getJson("/api/matches/resume/{$resume->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.items.0.matchPercentage', 82.5)
            ->assertJsonPath('data.items.0.matchSource', 'fallback');
    }

    public function test_seeker_cannot_fetch_other_seekers_matches(): void
    {
        $owner = User::factory()->seeker()->create();
        $other = User::factory()->seeker()->create();
        $resume = Resume::factory()->for($owner, 'user')->create();

        $this->actingAs($other, 'sanctum')
            ->getJson("/api/matches/resume/{$resume->id}")
            ->assertStatus(403);
    }

    public function test_candidate_resource_does_not_leak_extracted_text(): void
    {
        $seeker = User::factory()->seeker()->create();
        $recruiter = User::factory()->recruiter()->create();
        $resume = Resume::factory()->for($seeker, 'user')->create([
            'extracted_text' => 'SECRET RAW TEXT',
        ]);
        $job = JobPost::factory()->for($recruiter, 'recruiter')->create();

        JobMatch::create([
            'resume_id' => $resume->id,
            'job_post_id' => $job->id,
            'recruiter_id' => $recruiter->id,
            'match_percentage' => 70,
            'match_source' => 'fallback',
            'matched_skills_json' => ['skills' => ['Laravel']],
            'missing_skills_json' => ['skills' => ['Vue']],
            'analyzed_at' => now(),
        ]);

        $response = $this->actingAs($recruiter, 'sanctum')
            ->getJson("/api/jobs/{$job->id}/candidates")
            ->assertStatus(200);

        $body = $response->json();
        $this->assertStringNotContainsString('SECRET RAW TEXT', json_encode($body));
    }
}
