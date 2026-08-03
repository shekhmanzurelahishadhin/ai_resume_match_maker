<?php

namespace Tests\Unit;

use App\Services\HuggingFaceService;
use App\Services\SkillsDictionary;
use Tests\TestCase;

class HuggingFaceServiceTest extends TestCase
{
    private HuggingFaceService $service;

    protected function setUp(): void
    {
        parent::setUp();
        // No HUGGINGFACE_API_KEY in test env → every call falls back.
        $this->service = $this->app->make(HuggingFaceService::class);
    }

    public function test_extract_skills_falls_back_to_dictionary_without_api_key(): void
    {
        $result = $this->service->extractSkills('Experienced JavaScript and React developer with PHP skills.');

        $this->assertEquals('fallback', $result->source);
        $this->assertContains('JavaScript', $result->result['skills']);
        $this->assertContains('React', $result->result['skills']);
        $this->assertContains('PHP', $result->result['skills']);
    }

    public function test_match_resume_to_job_uses_tfidf_fallback(): void
    {
        $result = $this->service->matchResumeToJob(
            'I am a Laravel developer with PHP experience',
            'Looking for a PHP developer with Laravel skills',
        );

        $this->assertEquals('fallback', $result->source);
        $this->assertGreaterThan(0.0, $result->result['similarity']);
        $this->assertLessThanOrEqual(1.0, $result->result['similarity']);
    }

    public function test_categorize_skill_uses_static_lookup(): void
    {
        $result = $this->service->categorizeSkill('JavaScript');
        $this->assertEquals('fallback', $result->source);
        $this->assertEquals(SkillsDictionary::CATEGORY_TECHNICAL, $result->result);
    }

    public function test_enhance_bullet_uses_rule_based_fallback(): void
    {
        $result = $this->service->enhanceBullet('responsible for leading the team');
        $this->assertEquals('fallback', $result->source);
        // The rule-based enhance strips "responsible for" and prefixes an action verb.
        $this->assertStringNotContainsStringIgnoringCase('responsible for', $result->result);
    }

    public function test_tfidf_cosine_returns_zero_for_disjoint_texts(): void
    {
        $score = $this->service->tfidfCosine('apple banana', 'xylophone zebra');
        $this->assertEquals(0.0, $score);
    }

    public function test_tfidf_cosine_returns_high_score_for_identical_texts(): void
    {
        $score = $this->service->tfidfCosine('laravel php developer', 'laravel php developer');
        $this->assertGreaterThan(0.99, $score);
    }
}
