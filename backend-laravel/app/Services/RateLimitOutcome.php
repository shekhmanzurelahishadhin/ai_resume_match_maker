<?php

namespace App\Services;

class RateLimitOutcome
{
    private function __construct(
        public readonly bool $allowed,
        public readonly int $retryAfter,
        public readonly ?int $limit,
        public readonly ?int $remaining,
    ) {}

    public static function allowed(int $limit, int $used, int $windowSeconds): self
    {
        return new self(true, 0, $limit, max(0, $limit - $used));
    }

    public static function denied(int $retryAfter): self
    {
        return new self(false, max(1, $retryAfter), null, 0);
    }
}
