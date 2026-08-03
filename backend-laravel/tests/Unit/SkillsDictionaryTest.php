<?php

namespace Tests\Unit;

use App\Services\SkillsDictionary;
use Tests\TestCase;

class SkillsDictionaryTest extends TestCase
{
    public function test_dictionary_has_at_least_200_skills(): void
    {
        $this->assertGreaterThanOrEqual(200, SkillsDictionary::total());
    }

    public function test_extract_finds_known_skills(): void
    {
        $text = 'Full-stack engineer. JavaScript, TypeScript, React, Node.js, Laravel, PHP, Docker, PostgreSQL.';
        $result = SkillsDictionary::extract($text);

        $this->assertContains('JavaScript', $result['skills']);
        $this->assertContains('TypeScript', $result['skills']);
        $this->assertContains('React', $result['skills']);
        $this->assertContains('Laravel', $result['skills']);
        $this->assertContains('Docker', $result['skills']);
        $this->assertNotEmpty($result['categories']['Technical']);
        $this->assertNotEmpty($result['categories']['Tools']);
    }

    public function test_extract_dedupes_normalized_duplicates(): void
    {
        // "React" and "React Native" both normalize differently — both should match.
        $text = 'Worked with React and React Native.';
        $result = SkillsDictionary::extract($text);
        $this->assertContains('React', $result['skills']);
        $this->assertContains('React Native', $result['skills']);
    }

    public function test_categorize_returns_correct_category(): void
    {
        $this->assertEquals(SkillsDictionary::CATEGORY_TECHNICAL, SkillsDictionary::categorize('JavaScript'));
        $this->assertEquals(SkillsDictionary::CATEGORY_TOOLS, SkillsDictionary::categorize('Docker'));
        $this->assertEquals(SkillsDictionary::CATEGORY_SOFT_SKILLS, SkillsDictionary::categorize('Leadership'));
        $this->assertEquals(SkillsDictionary::CATEGORY_DOMAIN, SkillsDictionary::categorize('SEO'));
        $this->assertEquals(SkillsDictionary::CATEGORY_LANGUAGES, SkillsDictionary::categorize('Spanish'));
    }

    public function test_categorize_unknown_skill_falls_back_to_technical(): void
    {
        $this->assertEquals(SkillsDictionary::CATEGORY_TECHNICAL, SkillsDictionary::categorize('Quantum Computing'));
    }

    public function test_extract_returns_empty_for_text_without_skills(): void
    {
        $result = SkillsDictionary::extract('The quick brown fox jumps over the lazy dog.');
        $this->assertEmpty($result['skills']);
    }
}
