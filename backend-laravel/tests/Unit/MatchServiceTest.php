<?php

namespace Tests\Unit;

use App\Models\JobPost;
use App\Models\Resume;
use App\Models\User;
use App\Services\MatchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MatchServiceTest extends TestCase
{
    use RefreshDatabase;

    private MatchService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = $this->app->make(MatchService::class);
    }

    public function test_compute_match_combines_semantic_and_skills_overlap(): void
    {
        $computed = $this->service->computeMatch(
            resumeText: 'I know Laravel, PHP, and JavaScript',
            resumeSkills: ['Laravel', 'PHP', 'JavaScript'],
            jobText: 'Looking for a Laravel PHP developer',
            jobRequiredSkills: ['Laravel', 'PHP', 'Vue'],
        );

        // Matched: Laravel, PHP. Missing: Vue. Overlap = 2/3 = 0.667.
        $this->assertEqualsWithDelta(0.667, $computed->skillsOverlap, 0.01);
        $this->assertContains('Laravel', $computed->matchedSkills);
        $this->assertContains('Vue', $computed->missingSkills);
        $this->assertGreaterThan(0, $computed->matchPercentage);
        $this->assertLessThanOrEqual(100, $computed->matchPercentage);
        $this->assertEquals('fallback', $computed->matchSource);
    }

    public function test_compute_match_with_empty_job_skills_uses_neutral_overlap(): void
    {
        $computed = $this->service->computeMatch(
            resumeText: 'developer',
            resumeSkills: ['Laravel'],
            jobText: 'job',
            jobRequiredSkills: [],
        );

        $this->assertEquals(0.5, $computed->skillsOverlap);
    }

    public function test_compute_experience_years_extracts_year_ranges(): void
    {
        $text = "Software Engineer at Acme (2020-2023) and Senior Engineer at Globex (2023-Present).";
        $years = $this->service->computeExperienceYears($text);
        $this->assertGreaterThan(0, $years);
    }

    public function test_match_resume_against_all_jobs_is_idempotent(): void
    {
        $seeker = User::factory()->seeker()->create();
        $recruiter = User::factory()->recruiter()->create();
        $resume = Resume::factory()->for($seeker, 'user')->create([
            'extracted_text' => 'Laravel PHP developer',
            'skills_json' => ['skills' => ['Laravel', 'PHP'], 'categories' => []],
        ]);
        JobPost::factory()->for($recruiter, 'recruiter')->create(['is_active' => true]);

        $first = $this->service->matchResumeAgainstAllJobs($resume);
        $this->assertEquals(1, $first);

        // Run again — should delete + recreate, not duplicate.
        $second = $this->service->matchResumeAgainstAllJobs($resume);
        $this->assertEquals(1, $second);

        $this->assertDatabaseCount('matches', 1);
    }
}
