<?php

/**
 * Rate limits from §8 of the spec.
 *
 * These are consumed by:
 *   - app/Providers/AppServiceProvider.php boot() — registers named limiters
 *     used by the `throttle:` middleware.
 *   - app/Http/Middleware/RateLimitUploads.php    — 5/hr per user for uploads.
 *   - app/Http/Middleware/RateLimitGenerations.php — 10/hr per user for generations.
 *   - app/Services/RateLimitService.php          — DB-backed buckets for cases
 *     where Laravel's RateLimiter isn't a fit (e.g. sub-process jobs).
 */
return [
    'api' => [
        'max' => (int) env('RATE_LIMIT_API_PER_MINUTE', 60),
        'window_seconds' => 60,
    ],
    'resume_upload' => [
        'max' => (int) env('RATE_LIMIT_RESUME_UPLOAD_PER_HOUR', 5),
        'window_seconds' => 3600,
    ],
    'resume_generate' => [
        'max' => (int) env('RATE_LIMIT_RESUME_GENERATE_PER_HOUR', 10),
        'window_seconds' => 3600,
    ],
];
