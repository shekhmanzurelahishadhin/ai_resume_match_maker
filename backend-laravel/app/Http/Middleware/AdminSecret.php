<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guard for the admin-only daily digest trigger endpoint
 * (POST /api/notifications/digest/run).
 *
 * Fail-closed: when ADMIN_SECRET is unset, every request gets 401.
 */
class AdminSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = config('app.admin_secret') ?: env('ADMIN_SECRET');
        if (! $expected) {
            return response()->json([
                'error' => [
                    'message' => 'Admin secret not configured.',
                    'code' => 'ADMIN_NOT_CONFIGURED',
                    'status' => 401,
                ],
            ], 401);
        }

        $provided = $request->header('x-admin-secret');
        if (! $provided || ! hash_equals($expected, $provided)) {
            return response()->json([
                'error' => [
                    'message' => 'Invalid admin secret.',
                    'code' => 'INVALID_ADMIN_SECRET',
                    'status' => 401,
                ],
            ], 401);
        }

        return $next($request);
    }
}
