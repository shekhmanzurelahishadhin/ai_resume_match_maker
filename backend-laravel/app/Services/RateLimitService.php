<?php

namespace App\Services;

use App\Models\RateLimitBucket;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Database-backed rate limit buckets (§8 of spec).
 *
 * This complements Laravel's built-in RateLimiter (used by the throttle:
 * middleware) for cases where a sub-process job (e.g. queue worker) needs
 * to enforce a limit independent of the HTTP request lifecycle.
 *
 * The HTTP-facing rate limits are wired in app/Providers/AppServiceProvider.php
 * via RateLimiter::for('api' | 'uploads' | 'generations'). This service is
 * used by app/Http/Middleware/RateLimitUploads and RateLimitGenerations as
 * the persistent backing store (so limits survive process restarts and
 * work across multiple queue workers).
 */
class RateLimitService
{
    public function consume(string $key, int $max, int $windowSeconds): RateLimitOutcome
    {
        try {
            return $this->attempt($key, $max, $windowSeconds);
        } catch (UniqueConstraintViolationException) {
            // A concurrent request inserted the bucket between our read and our
            // insert. The row exists now, so the retry takes the update path.
            return $this->attempt($key, $max, $windowSeconds);
        }
    }

    private function attempt(string $key, int $max, int $windowSeconds): RateLimitOutcome
    {
        return DB::transaction(function () use ($key, $max, $windowSeconds) {
            $bucket = RateLimitBucket::where('key', $key)->lockForUpdate()->first();

            if ($bucket === null) {
                RateLimitBucket::create([
                    'key' => $key,
                    'count' => 1,
                    'window_end' => now()->addSeconds($windowSeconds),
                ]);
                return RateLimitOutcome::allowed($max, 1, $windowSeconds);
            }

            if ($bucket->window_end->isPast()) {
                // Start a fresh window on the existing row. `key` is unique, so
                // an expired bucket has to be updated, never re-inserted.
                $bucket->forceFill([
                    'count' => 1,
                    'window_end' => now()->addSeconds($windowSeconds),
                ])->save();
                return RateLimitOutcome::allowed($max, 1, $windowSeconds);
            }

            if ($bucket->count >= $max) {
                return RateLimitOutcome::denied($bucket->retryAfterSeconds());
            }

            $bucket->increment('count');
            $bucket->refresh();
            return RateLimitOutcome::allowed($max, $bucket->count, $windowSeconds);
        });
    }

    public function reset(string $key): bool
    {
        try {
            RateLimitBucket::where('key', $key)->delete();
            return true;
        } catch (\Throwable $e) {
            Log::warning(json_encode(['level' => 'warn', 'event' => 'rate_limit_reset_failed', 'error' => $e->getMessage()]));
            return false;
        }
    }

    public function purgeExpired(): int
    {
        return RateLimitBucket::where('window_end', '<', now())->delete();
    }
}
