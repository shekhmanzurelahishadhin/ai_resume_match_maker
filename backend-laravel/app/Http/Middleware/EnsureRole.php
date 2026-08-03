<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Role guard: `role:seeker` or `role:recruiter` route middleware.
 *
 * Aborts with 403 (mapped to { error: { code: 'FORBIDDEN' } } by bootstrap/app.php)
 * when the authenticated user's role doesn't match.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json([
                'error' => ['message' => 'Unauthenticated.', 'code' => 'UNAUTHENTICATED', 'status' => 401],
            ], 401);
        }

        $userRole = UserRole::fromValue($user->role instanceof UserRole ? $user->role->value : (string) $user->role);

        foreach ($roles as $role) {
            $expected = UserRole::fromValue($role);
            if ($userRole === $expected) {
                return $next($request);
            }
        }

        return response()->json([
            'error' => [
                'message' => 'This action requires the '.implode(' or ', $roles).' role.',
                'code' => 'FORBIDDEN',
                'status' => 403,
            ],
        ], 403);
    }
}
