<?php

namespace Tests\Feature;

use App\Models\JobPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeker_cannot_create_job(): void
    {
        $seeker = User::factory()->seeker()->create();

        $this->actingAs($seeker, 'sanctum')
            ->postJson('/api/jobs', [
                'title' => 'Senior Engineer',
                'description' => 'Build things.',
                'requiredSkills' => ['Laravel', 'PHP'],
            ])
            ->assertStatus(403);
    }

    public function test_recruiter_can_create_job(): void
    {
        $recruiter = User::factory()->recruiter()->create();

        $this->actingAs($recruiter, 'sanctum')
            ->postJson('/api/jobs', [
                'title' => 'Senior Engineer',
                'description' => 'Build things.',
                'requiredSkills' => ['Laravel', 'PHP'],
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.job.title', 'Senior Engineer');

        $this->assertDatabaseHas('job_posts', ['recruiter_id' => $recruiter->id]);
    }

    public function test_seeker_sees_only_active_jobs(): void
    {
        $recruiter = User::factory()->recruiter()->create();
        JobPost::factory()->for($recruiter, 'recruiter')->create(['is_active' => true, 'title' => 'Active Job']);
        JobPost::factory()->for($recruiter, 'recruiter')->create(['is_active' => false, 'title' => 'Inactive Job']);

        $seeker = User::factory()->seeker()->create();

        $this->actingAs($seeker, 'sanctum')
            ->getJson('/api/jobs')
            ->assertStatus(200)
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.items.0.title', 'Active Job');
    }

    public function test_recruiter_cannot_edit_other_recruiters_job(): void
    {
        $owner = User::factory()->recruiter()->create();
        $other = User::factory()->recruiter()->create();
        $job = JobPost::factory()->for($owner, 'recruiter')->create();

        $this->actingAs($other, 'sanctum')
            ->putJson("/api/jobs/{$job->id}", ['title' => 'Hacked'])
            ->assertStatus(403);
    }

    public function test_recruiter_can_list_their_own_jobs_including_inactive(): void
    {
        $recruiter = User::factory()->recruiter()->create();
        JobPost::factory()->for($recruiter, 'recruiter')->create(['is_active' => false]);

        $this->actingAs($recruiter, 'sanctum')
            ->getJson('/api/jobs')
            ->assertStatus(200)
            ->assertJsonPath('data.total', 1);
    }
}
