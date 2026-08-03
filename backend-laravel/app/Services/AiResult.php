<?php

namespace App\Services;

/**
 * Strongly-typed result wrapper for AI calls.
 *
 * @template T
 */
class AiResult
{
    private function __construct(
        public readonly mixed $result,
        public readonly string $source, // 'ai' | 'fallback'
    ) {}

    public static function ai(mixed $result): self
    {
        return new self($result, 'ai');
    }

    public static function fallback(mixed $result): self
    {
        return new self($result, 'fallback');
    }

    public function isAi(): bool
    {
        return $this->source === 'ai';
    }

    public function isFallback(): bool
    {
        return $this->source === 'fallback';
    }

    /** @return array{result: mixed, source: string} */
    public function toArray(): array
    {
        return ['result' => $this->result, 'source' => $this->source];
    }
}
