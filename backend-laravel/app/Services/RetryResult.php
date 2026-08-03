<?php

namespace App\Services;

/**
 * Internal retry outcome for HuggingFaceService::withRetry().
 */
class RetryResult
{
    private function __construct(
        public readonly bool $ok,
        public readonly mixed $value,
        public readonly string $error,
    ) {}

    public static function ok(mixed $value): self
    {
        return new self(true, $value, '');
    }

    public static function fail(string $error): self
    {
        return new self(false, null, $error);
    }
}
