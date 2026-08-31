<?php

namespace App\Services\Contracts;

use App\Services\AiResult;

/**
 * Shared AI provider contract.
 *
 * Both HuggingFaceService and GroqService implement this, so controllers, jobs
 * and MatchService type-hint the interface rather than a concrete provider.
 * Every method returns AiResult<T> = ['result' => T, 'source' => 'ai'|'fallback'];
 * 'fallback' means the AI path was unavailable (no key, transport error,
 * unusable output) and a deterministic local implementation produced the value.
 */
interface AiService
{
    public function isConfigured(): bool;

    /**
     * Deterministic TF-IDF cosine similarity in [0, 1].
     *
     * Costs nothing and needs no network, so callers can use it to screen
     * candidates before spending an AI call on them.
     */
    public function tfidfCosine(string $a, string $b): float;

    /**
     * @return AiResult<array{skills: list<string>, categories: array<string, list<string>>}>
     */
    public function extractSkills(string $text): AiResult;

    /**
     * @return AiResult<array{similarity: float}>
     */
    public function matchResumeToJob(string $resumeText, string $jobText): AiResult;

    /**
     * @return AiResult<string>
     */
    public function categorizeSkill(string $skill): AiResult;

    /**
     * @return AiResult<string>
     */
    public function enhanceBullet(string $text): AiResult;

    /**
     * @param list<string> $skills
     * @return AiResult<string>
     */
    public function generateSummary(string $role, array $skills, int $experienceYears = 0): AiResult;

    /**
     * Turn raw resume text into the structured content the builder renders:
     * contact, summary, experience, education, projects, certifications.
     *
     * Skills are supplied separately by the caller (they are already extracted
     * and stored on the Resume row), so implementations should not re-derive
     * them here.
     *
     * @return AiResult<array{
     *     contact: array<string, string>,
     *     summary: string,
     *     experience: list<array<string, mixed>>,
     *     education: list<array<string, mixed>>,
     *     projects: list<array<string, mixed>>,
     *     certifications: list<array<string, mixed>>
     * }>
     */
    public function extractResumeContent(string $text): AiResult;
}
