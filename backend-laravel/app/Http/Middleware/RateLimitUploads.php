<?php

namespace App\Http\Middleware;

use App\Services\RateLimitService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * 5 uploads / hour / user (§8).
 *
 * Used on POST /api/resumes/upload.
 */
class RateLimitUploads
{
    public function __construct(private RateLimitService $rateLimits) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json([
                'error' => ['message' => 'Unauthenticated.', 'code' => 'UNAUTHENTICATED', 'status' => 401],
            ], 401);
        }

        $cfg = config('rate-limit.resume_upload');
        $outcome = $this->rateLimits->consume(
            "resume_upload:user:{$user->id}",
            $cfg['max'],
            $cfg['window_seconds'],
        );

        if (! $outcome->allowed) {
            return response()->json([
                'error' => [
                    'message' => 'Resume upload limit exceeded (5/hour).',
                    'code' => 'RATE_LIMITED',
                    'status' => 429,
                    'retryAfter' => $outcome->retryAfter,
                ],
            ], 429, ['Retry-After' => $outcome->retryAfter]);
        }

        $response = $next($request);
        $response->headers->set('X-RateLimit-Limit', (string) $outcome->limit);
        $response->headers->set('X-RateLimit-Remaining', (string) $outcome->remaining);
        return $response;
    }
}
