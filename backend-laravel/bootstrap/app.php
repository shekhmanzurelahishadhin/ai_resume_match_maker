<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // API stateful for Sanctum cookie auth from the Next.js frontend.
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        // Custom middleware aliases (§8 rate limits + role guard + admin secret).
        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureRole::class,
            'throttle.uploads' => \App\Http\Middleware\RateLimitUploads::class,
            'throttle.generations' => \App\Http\Middleware\RateLimitGenerations::class,
            'admin.secret' => \App\Http\Middleware\AdminSecret::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Normalize every error to the { error: { message, code, ... } } shape
        // used by the Next.js frontend.

        $render = function (\Throwable $e, int $status, string $code, ?array $extra = null) {
            return function (Request $request) use ($e, $status, $code, $extra) {
                if ($request->expectsJson() || $request->is('api/*')) {
                    $payload = [
                        'error' => array_filter(array_merge([
                            'message' => $e->getMessage() ?: $code,
                            'code' => $code,
                            'status' => $status,
                        ], $extra ?? [])),
                    ];
                    return response()->json($payload, $status);
                }

                return null;
            };
        };

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'error' => [
                        'message' => 'Validation failed',
                        'code' => 'VALIDATION_ERROR',
                        'status' => 422,
                        'fieldErrors' => $e->errors(),
                    ],
                ], 422);
            }
            return null;
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'error' => [
                        'message' => 'Unauthenticated.',
                        'code' => 'UNAUTHENTICATED',
                        'status' => 401,
                    ],
                ], 401);
            }
            return null;
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'error' => [
                        'message' => $e->getMessage() ?: 'Forbidden.',
                        'code' => 'FORBIDDEN',
                        'status' => 403,
                    ],
                ], 403);
            }
            return null;
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'error' => [
                        'message' => 'Not found.',
                        'code' => 'NOT_FOUND',
                        'status' => 404,
                    ],
                ], 404);
            }
            return null;
        });

        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'error' => [
                        'message' => 'Method not allowed.',
                        'code' => 'METHOD_NOT_ALLOWED',
                        'status' => 405,
                    ],
                ], 405);
            }
            return null;
        });

        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                $retryAfter = (int) ($e->getHeaders()['Retry-After'] ?? 60);
                return response()->json([
                    'error' => [
                        'message' => 'Too many requests.',
                        'code' => 'RATE_LIMITED',
                        'status' => 429,
                        'retryAfter' => $retryAfter,
                    ],
                ], 429, ['Retry-After' => $retryAfter]);
            }
            return null;
        });
    })->create();
