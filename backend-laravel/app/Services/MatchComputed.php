<?php

namespace App\Services;

/**
 * Strongly-typed match-scoring result used by MatchService::computeMatch().
 */
class MatchComputed
{
    public function __construct(
        public readonly int $matchPercentage,
        public readonly string $matchSource, // 'ai' | 'fallback'
        public readonly array $matchedSkills,
        public readonly array $missingSkills,
        public readonly float $semanticSimilarity,
        public readonly float $skillsOverlap,
    ) {}

    public function toArray(): array
    {
        return [
            'matchPercentage' => $this->matchPercentage,
            'matchSource' => $this->matchSource,
            'matchedSkills' => $this->matchedSkills,
            'missingSkills' => $this->missingSkills,
            'semanticSimilarity' => $this->semanticSimilarity,
            'skillsOverlap' => $this->skillsOverlap,
        ];
    }

    public static function fromArray(array $data): self
    {
        return new self(
            matchPercentage: (int) ($data['matchPercentage'] ?? 0),
            matchSource: (string) ($data['matchSource'] ?? 'fallback'),
            matchedSkills: $data['matchedSkills'] ?? [],
            missingSkills: $data['missingSkills'] ?? [],
            semanticSimilarity: (float) ($data['semanticSimilarity'] ?? 0.0),
            skillsOverlap: (float) ($data['skillsOverlap'] ?? 0.0),
        );
    }
}
